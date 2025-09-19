import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Chart from 'chart.js/auto';
import 'boxicons/css/boxicons.min.css';
import styles from './adminDashboard.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Dashboard = () => {
    const [activeSection, setActiveSection] = useState('elections');
    const navigate = useNavigate();
    const location = useLocation();

    const [isLoading, setIsLoading] = useState(true);
    const [selectedElectionId, setSelectedElectionId] = useState(null);
    const [copiedElectionId, setCopiedElectionId] = useState(null);
    const [originalElections, setOriginalElections] = useState([]);
    const [newRequests, setNewRequests] = useState(new Set());
    const [showBellTooltip, setShowBellTooltip] = useState(false);
    const prevPending = useRef([]);
    const [elections, setElections] = useState([]);
    const [pendingRegistrations, setPendingRegistrations] = useState([]);
    const [approvedRegistrations, setApprovedRegistrations] = useState([]);
    const [declinedRegistrations, setDeclinedRegistrations] = useState([]);
    const [loadingRegistrationId, setLoadingRegistrationId] = useState(null);
    const [ecMembers, setEcMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [voteCounts, setVoteCounts] = useState({});
    const [candidateVotes, setCandidateVotes] = useState({});
    const [voteTimestamps, setVoteTimestamps] = useState([]);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [electionToDelete, setElectionToDelete] = useState(null);
    const [docsUrl] = useState('../docs');

    const logAuditEvent = useCallback(async (auditData) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/audit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(auditData),
            });

            if (!response.ok) {
            throw new Error('Failed to log audit event');
            }
        } catch (error) {
            console.error('Error logging audit event:', error);
        }
    }, []);

    //Notification to show the current logged-in user
    useEffect(() => {
        if (location.state?.adminName) {
            toast.info(`Logged in as ${location.state.adminName} - ${location.state.adminRole}`, {
                autoClose: 3000
            });
        }
    }, [location.state]);

    // Fetch elections and initialize elections states
    const fetchElections = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/elections/`);
            const electionsData = await response.json();

            // Process elections data
            const processedElections = electionsData.map(election => ({
                id: election.id,
                title: election.title,
                positions: election.positions,
                type: election.type,
                max_votes: election.max_votes,
                status: election.status,
                startTime: new Date(election.start_time),
                endTime: new Date(election.end_time),
                description: election.description,
                candidates: election.candidates || [],
                createdAt: new Date(election.created_at),
                registration_link: election.registration_link
            }));

            setOriginalElections(processedElections);
            setElections(processedElections);
        } catch (error) {
            console.error('Error fetching elections:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchElections();
    }, []); 

    // Poll elections every 1 minute
    useEffect(() => {
        const interval = setInterval(() => {
            fetchElections();
        }, 60000); // 1 minute
        return () => clearInterval(interval);
    }, []);

    const now = new Date();

    // Calculate election stats for the overview cards
    const electionStats = elections.reduce((acc, election) => {
        if (election.status === 'upcoming') acc.upcoming++;
        else if (election.status === 'active') acc.active++;
        else if (election.status === 'completed') acc.completed++;
        return acc;
    }, { upcoming: 0, active: 0, completed: 0 });

    // Calculate recent completed elections (within last 27 days)
    const recentCompleted = elections.filter(election => {
        const endTime = election.endTime instanceof Date ? 
            election.endTime : new Date(0);
        return election.status === 'completed' && 
            endTime > new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000);
    }).length;

    //function to group candidates
    const candidateStats = elections.reduce((acc, election) => {
        acc.totalCandidates += election.candidates?.length || 0;
        const electionPositions = new Set();
        election.candidates?.forEach(candidate => {
            const position = candidate.position.trim().toLowerCase();
            electionPositions.add(position);
            if (position.includes("president")) {
                acc.presidentialCandidates++;
            }
        });
        acc.uniquePositions += electionPositions.size;
        return acc;
    }, { totalCandidates: 0, uniquePositions: 0, presidentialCandidates: 0 });

    //function to get registrants
    const fetchRegistrations = useCallback(async (status) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/voter/registrations?status=${status}`);
            const data = await response.json();
            //registrations with election title
            const titleData = data.map(reg => ({
                ...reg,
                electionId: reg.election_id || reg.electionId,
                registered_at: reg.registered_at ? new Date(reg.registered_at) : null,
                approved_at: reg.approved_at ? new Date(reg.approved_at) : null,
                rejected_at: reg.rejected_at ? new Date(reg.rejected_at) : null,
                electionTitle: reg.election_title || 'Unknown Election'
            }));
            if (status === 'pending') setPendingRegistrations(titleData);
            else if (status === 'approved') setApprovedRegistrations(titleData);
            else if (status === 'rejected') setDeclinedRegistrations(titleData);
        } catch (error) {
            console.error(`Error fetching ${status} registrations:`, error);
        }
    }, []);

    // Real-time listeners for registrations
    useEffect(() => {
        fetchRegistrations('pending');
        fetchRegistrations('approved');
        fetchRegistrations('rejected');
        const interval = setInterval(() => {
            fetchRegistrations('pending');
            fetchRegistrations('approved');
            fetchRegistrations('rejected');
        }, 300000);
        return () => clearInterval(interval);
    }, [elections, fetchRegistrations]); // Add elections and fetchRegistrations as dependencies

    //helper function to view a particular/specific election if their status are active
    const displayElection = React.useMemo(() => {
        if (selectedElectionId) {
            return elections.find(e => e.id === selectedElectionId);
        }
        return elections
            .filter(e => e.status === 'active')
            .sort((a, b) => b.createdAt - a.createdAt)[0];
    }, [elections, selectedElectionId]);

    useEffect(() => {
        // Compare current pending registrations with previous ones
        const currentIds = pendingRegistrations.map(r => r.id);
        const prevIds = prevPending.current.map(r => r.id);
        
        // Find new registrations that weren't in previous list
        const newIds = currentIds.filter(id => !prevIds.includes(id));
        
        if (newIds.length > 0) {
            setNewRequests(prev => {
            const updated = new Set(prev);
            newIds.forEach(id => updated.add(id));
            return updated;
            });
        }
        
        // Update ref with current pending registrations
        prevPending.current = pendingRegistrations;
    }, [pendingRegistrations]);

    // Clean up ref on component unmount
    useEffect(() => {
        return () => {
            prevPending.current = [];
        };
    }, []);


    //function to handle approve/decline actions of registrants
    const handleAction = (registrationId) => {
        setNewRequests(prev => {
            const updated = new Set(prev);
            updated.delete(registrationId);
            return updated;
        });
    };

    //function to handle approve actions of registrants
    const handleApprove = async (registrationId) => {
        try {
            setLoadingRegistrationId(registrationId);

            setPendingRegistrations(prev => 
                prev.filter(reg => reg.id !== registrationId)
            );

            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/voter/registrations/${registrationId}/approved`, {
                method: 'PATCH'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Approval failed');
            }

            // Only refetch after successful API call
            await fetchRegistrations('pending');
            await fetchRegistrations('approved');

            // Get registration details
            const registration = pendingRegistrations.find(r => r.id === registrationId);
    
            // Log audit event
            await logAuditEvent({
                action: 'registration_approved',
                actorType: 'ec_member',
                ecMemberName: sessionStorage.getItem('ecAdminName'),
                electionId: registration.electionId,
                electionTitle: registration.electionTitle,
                voterEmail: registration.email
            });
    
            handleAction(registrationId);
            toast.success('OTP sent successfully!');
        } catch (error) {
            fetchRegistrations('pending');
            toast.error('Approval failed');
        } finally {
            setLoadingRegistrationId(null);
        }
    };

    //function to handle decline actions of registrants
    const handleDecline = async (registrationId) => {
        const registrationToDecline = pendingRegistrations.find(
            reg => reg.id === registrationId
        );

        if (!registrationToDecline) return;

        try {
            // Optimistic removal
            setPendingRegistrations(prev => 
            prev.filter(reg => reg.id !== registrationId)
            );
            
            await fetch(`${process.env.REACT_APP_API_BASE_URL}/voter/registrations/${registrationId}/rejected`, {
            method: 'PATCH'
            });
            
            // Refetch both lists
            await fetchRegistrations('pending');
            await fetchRegistrations('rejected');

            // Get registration details
            const registration = registrationToDecline;
            
            // Log audit event
            await logAuditEvent({
                action: 'registration_rejected',
                actorType: 'ec_member',
                ecMemberName: sessionStorage.getItem('ecAdminName') || 'Admin',
                electionId: registration.electionId,
                electionTitle: registration.electionTitle,
                voterEmail: registration.email
            });
            
            handleAction(registrationId);
        } catch (error) {
            // Revert on error
            setPendingRegistrations(prev => [
                ...prev, 
                registrationToDecline
            ]);
            toast.error('Decline failed');
        }
    };

    // Filtering for specific elections for registrants
    const filteredPending = selectedElectionId
        ? pendingRegistrations.filter(r => r.electionId === selectedElectionId)
        : pendingRegistrations;
    const filteredApproved = selectedElectionId
        ? approvedRegistrations.filter(r => r.electionId === selectedElectionId)
        : approvedRegistrations;
    const filteredDeclined = selectedElectionId
        ? declinedRegistrations.filter(r => r.electionId === selectedElectionId)
        : declinedRegistrations;

    //function to count registrants in various statuses
    const voterStats = {
        pending: filteredPending.length,
        approved: filteredApproved.length,
        declined: filteredDeclined.length
    };

    //vote count functionality
    useEffect(() => {
        const fetchVoteData = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/vote/counts`);
                const data = await response.json();

                const counts = {};
                const votedElectionsMap = {};
                Object.entries(data).forEach(([electionId, { voterCount, voters }]) => {
                    counts[electionId] = voterCount;
                    voters.forEach(email => {
                    if (!votedElectionsMap[email]) {
                        votedElectionsMap[email] = new Set();
                    }
                    votedElectionsMap[email].add(electionId);
                    });
                });
                setVoteCounts(counts);
            } catch (error) {
                console.error('Error fetching vote data:', error);
            }
        };

        fetchVoteData();
        const interval = setInterval(fetchVoteData, 10000);
        return () => clearInterval(interval);
    }, []);

    //vote count functionality for individuals
    useEffect(() => {
        const fetchCandidateVotes = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/vote/candidates`);
                const data = await response.json();
                setCandidateVotes(data);
            } catch (error) {
                console.error('Error fetching candidate votes:', error);
            }
        };

        fetchCandidateVotes();
        const interval = setInterval(fetchCandidateVotes, 10000);
        return () => clearInterval(interval);
    }, []);

    //function for voting times of registrants
    useEffect(() => {
        const fetchVoteTimestamps = async () => {
            if (!displayElection) return;
            try {
                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/vote/timestamps?electionId=${displayElection.id}`);
                const data = await response.json();
                setVoteTimestamps(data);
            } catch (error) {
                console.error('Error fetching vote timestamps:', error);
            }
        };

        fetchVoteTimestamps();
        const interval = setInterval(fetchVoteTimestamps, 10000);
        return () => clearInterval(interval);
    }, [displayElection]);

    //function to populate the hourly graph in results&analytics
    const processHourlyData = (election, allVotes) => {
        if (!election?.startTime) return { labels: [], data: [] };

        const start = election.startTime;
        const end = election.status === 'completed'
            ? election.endTime
            : new Date();

        // Filter votes for this election
        const votes = allVotes.filter(v =>
            v.electionId === election.id &&
            v.timestamp >= start &&
            v.timestamp <= end
        );

        // Create hourly buckets
        const hourlyBuckets = new Map();
        const currentHour = new Date(start);
        currentHour.setMinutes(0, 0, 0);

        while (currentHour <= end) {
            hourlyBuckets.set(currentHour.getTime(), 0);
            currentHour.setHours(currentHour.getHours() + 1);
        }

        // Count votes per hour
        votes.forEach(vote => {
            const hour = new Date(vote.timestamp);
            hour.setMinutes(0, 0, 0);
            const key = hour.getTime();
            hourlyBuckets.set(key, (hourlyBuckets.get(key) || 0) + 1);
        });

        // Convert to cumulative data
        let cumulative = 0;
        const labels = [];
        const data = [];

        Array.from(hourlyBuckets.entries())
            .sort((a, b) => a[0] - b[0])
            .forEach(([time, count]) => {
                cumulative += count;
                labels.push(
                    new Date(time).toLocaleTimeString([], {
                        hour: '2-digit',
                        hour12: false
                    })
                );
                data.push(cumulative);
            });

        return { labels, data };
    };

    // Update elections with vote counts
    useEffect(() => {
        setElections(prev => prev.map(election => ({
            ...election,
            voteCount: voteCounts[election.id] || 0
        })));
    }, [voteCounts]);
    
    //function to get registrants who had voted against non-voters
    const getTurnoutData = (election) => {
        const approvedCount = approvedRegistrations
            .filter(r => r.election_id === election.id).length;

        if (approvedCount === 0) return 'No approved voters';

        const voteCount = election.voteCount ?? 0;
        const turnout = approvedCount > 0 
            ? ((voteCount / approvedCount) * 100).toFixed(1) 
            : '0.0';
    
        return `${voteCount}/${approvedCount} (${turnout}%)`;
    };

    // function to view a particular/specific election
    const handleViewElection = async (electionId) => {
        try {
            // If clicking the same election, reset to show all
            if (selectedElectionId === electionId) {
            setSelectedElectionId(null);
            setElections(originalElections); // Restore original list
            return;
            }

            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/elections/${electionId}`);
            const electionData = await response.json();

            const processedElection = {
                ...electionData,
                startTime: new Date(electionData.start_time),
                endTime: new Date(electionData.end_time),
                createdAt: new Date(electionData.created_at),
                candidates: electionData.candidates || []
            };

            setSelectedElectionId(electionId);

            // Log audit event
            await logAuditEvent({
                action: 'election_viewed',
                actorType: 'ec_member',
                ecMemberName: sessionStorage.getItem('ecAdminName') || 'Admin',
                electionId: electionId,
                electionTitle: electionData.title
            });

            setElections(originalElections.map(e => 
            e.id === electionId ? processedElection : e
            ));
            
        } catch (error) {
            toast.error('Failed to fetch election details');
        }
    };

    const handleDeleteElection = async (electionId) => {
        try{
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/elections/${electionId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete election');
            }

            // Remove the deleted election from the state
            setElections(prev => prev.filter(election => election.id !== electionId));
            toast.success('Election deleted successfully');
        } catch (error) {
            toast.error('Failed to delete election');
        }
    };

    //copy function
    const copyRegistrationLink = async (link, electionId) => {
        try {
            await navigator.clipboard.writeText(link);
            setCopiedElectionId(electionId);
            
            setTimeout(() => {
            setCopiedElectionId(null);
            }, 3000);
            
            toast.success('Registration link copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy: ', err);
            toast.error('Failed to copy link');
        }
    };

    useEffect(() => {
        setOriginalElections(prev =>
            prev.map(election => ({
                ...election,
                voteCount: voteCounts[election.id] || 0
            }))
        );

        // If not viewing a specific election, update the full list
        if (!selectedElectionId) {
            setElections(prev =>
                prev.map(election => ({
                    ...election,
                    voteCount: voteCounts[election.id] || 0
                }))
            );
        }
    }, [voteCounts, selectedElectionId]);

    //function to display initials of ec memebers
    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return 'EC';
        const cleanedName = name.trim();
        if (cleanedName.length === 0) return 'EC';

        const names = cleanedName.split(' ');
        if (names.length === 1) return names[0][0].toUpperCase();

        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    };

    //function to retrieve ec members
    useEffect(() => {
        const fetchECMembers = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/ec-members`);
            const data = await response.json();
            
            // Sort by role priority
            const sorted = data.sort((a, b) => 
                ['chairperson', '1st deputy', '2nd deputy'].indexOf(a.role) -
                ['chairperson', '1st deputy', '2nd deputy'].indexOf(b.role)
            );
            
            setEcMembers(sorted);
        } catch (error) {
            toast.error('Failed to load EC members');
        }
        };
        fetchECMembers();
    }, []);

    // Refs for the chart canvases
    const votesChartRef = useRef(null);
    const demographicChartRef = useRef(null);
    const turnoutChartRef = useRef(null);
    const chartsRef = useRef({
        votes: null,
        demographic: null,
        turnout: null
    });

    const initializeCharts = useCallback(() => {
        Object.values(chartsRef.current).forEach(chart => chart && chart.destroy());

        // Get the election to display - prioritize selected election
        const displayElection = selectedElectionId
            ? elections.find(e => e.id === selectedElectionId)
            : elections.filter(e => e.status === 'active')
                .sort((a, b) => b.createdAt - a.createdAt)[0];

        if (!displayElection) return;

        // Get candidates for THE DISPLAY ELECTION (not active election)
        const presidentialCandidates = displayElection.candidates?.filter(c =>
            c.position.trim().toLowerCase().includes('president')
        ) || [];

        const candidateData = presidentialCandidates.map(c => ({
            ...c,
            votes: candidateVotes[c.id] || 0
        })).sort((a, b) => b.votes - a.votes);

        const labels = candidateData.map(c => c.name);
        const data = candidateData.map(c => c.votes);
        const colors = ['#6366f1','#4CAF50','#f44336','#FF9800','#9C27B0'];

        if (labels.length > 0) {
            // Bar chart
            if (votesChartRef.current) {
                const ctx = votesChartRef.current.getContext('2d');
                chartsRef.current.votes = new Chart(ctx, {
                    type: 'bar',
                    data: { labels, datasets: [{ label: 'Votes', data, backgroundColor: colors }]},
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }

            // Pie chart
            if (demographicChartRef.current) {
                const ctx = demographicChartRef.current.getContext('2d');
                chartsRef.current.demographic = new Chart(ctx, {
                    type: 'pie',
                    data: { labels, datasets: [{ data, backgroundColor: colors }]},
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        }

        //line chart to track votes per hoururly votes
        if (turnoutChartRef.current) {
            const ctx = turnoutChartRef.current.getContext('2d');
            const { labels, data } = processHourlyData(displayElection, voteTimestamps);

            chartsRef.current.turnout = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Cumulative Votes',
                        data,
                        borderColor: '#6366f1',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Time'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Total Votes'
                            },
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }, [elections, candidateVotes, selectedElectionId, voteTimestamps]);

    //only initialize chart when user selects results&analytics section to optimize speed
    useEffect(() => {
        if (activeSection === 'results') {
            initializeCharts();
        }
    }, [candidateVotes, activeSection, initializeCharts, voteTimestamps]);

    useEffect(() => {
        const charts = chartsRef.current;
        return () => {
            Object.values(charts).forEach(chart => {
                if (chart) chart.destroy();
            });
        };
    }, []);

    // Navigation handler
    const handleNavClick = (target) => {
        setActiveSection(target);
        setSearchQuery('');
    };

    //function to generate chart images in the results pdf
    const generateChartImage = (labels, data, colors) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');

            const chart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { font: { size: 12 } }
                        },
                        title: {
                            display: true,
                            text: 'Presidential Candidates Vote Distribution',
                            font: { size: 14 }
                        }
                    },
                    animation: {
                        onComplete: () => {
                            const imageData = canvas.toDataURL('image/png');
                            resolve(imageData);
                            chart.destroy();
                            canvas.remove();
                        }
                    }
                }
            });
        });
    };

    //navigation to create new elections
    const handleNewElectionsClick = (e) => {
        e.preventDefault();
        navigate('/createElections');
    };

    //results pdf generation functionality
    const generateElectionReport = async (election) => {
        const doc = new jsPDF();
        const isProvisional = election.status === 'active';
        const title = `${election.title} - ${isProvisional ? 'Provisional Results' : 'Final Results'}`;

        // Title and Dates
        doc.setFontSize(18);
        doc.text(title, 14, 20);
        doc.setFontSize(12);
        doc.text(`Election Period: ${election.startTime?.toLocaleDateString()} - ${election.endTime?.toLocaleDateString()}`, 14, 30);

        // Group candidates by position
        const positions = election.candidates?.reduce((acc, candidate) => {
            const position = candidate.position.trim();
            acc[position] = acc[position] || [];
            acc[position].push(candidate);
            return acc;
        }, {});

        // Sort positions with President first
        const sortedPositions = Object.keys(positions || {}).sort((a, b) => {
            const aIsPresident = a.toLowerCase().includes('president');
            const bIsPresident = b.toLowerCase().includes('president');
            if (aIsPresident && !bIsPresident) return -1;
            if (!aIsPresident && bIsPresident) return 1;
            return a.localeCompare(b);
        });

        let yPos = 40;

        //Presidential Candidates Pie Chart
        const presidentialCandidates = election.candidates?.filter(c =>
            c.position.trim().toLowerCase().includes('president')
        ) || [];

        if (presidentialCandidates.length > 0) {
            const candidateData = presidentialCandidates.map(c => ({
                name: c.name,
                votes: candidateVotes[c.id] || 0
            })).sort((a, b) => b.votes - a.votes);

            const labels = candidateData.map(c => c.name);
            const data = candidateData.map(c => c.votes);
            const colors = ['#6366f1','#4CAF50','#f44336','#FF9800','#9C27B0'];

            if (data.some(v => v > 0)) {
                try {
                    const imageData = await generateChartImage(labels, data, colors);
                    doc.addImage(imageData, 'PNG', 15, yPos, 180, 180);
                    yPos += 190;
                } catch (error) {
                    console.error('Error generating chart:', error);
                }
            }
        }

        sortedPositions.forEach(position => {
            const candidates = positions[position]
                .map(c => ({ ...c, votes: candidateVotes[c.id] || 0 }))
                .sort((a, b) => b.votes - a.votes);

            // Position Header
            doc.setFontSize(14);
            doc.text(`${position} Candidates`, 14, yPos);
            yPos += 10;

            // Table Data with percentage calculation
            const voteCount = election.voteCount || 0;
            const tableData = candidates.map(candidate => [
                candidate.name,
                candidate.votes,
                ...(isProvisional ? [] : [
                    `${(((candidate.votes || 0) / (voteCount || 1) * 100).toFixed(1))}%`
                ])
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Candidate', 'Votes', ...(isProvisional ? [] : ['Percentage']) ]],
                body: tableData,
                styles: { overflow: 'linebreak' },
                headStyles: { fillColor: [41, 128, 185] },
            });

            yPos = doc.lastAutoTable.finalY + 15;
        });

        // Add Summary for Final Results
        if (!isProvisional) {
            const approvedVoters = approvedRegistrations
                .filter(r => r.electionId === election.id).length;
            const voteCount = election.voteCount || 0;

            // Handle division by zero case
            const turnout = approvedVoters > 0
                ? ((voteCount / approvedVoters) * 100).toFixed(1)
                : 0;

            doc.setFontSize(14);
            doc.text(`Final Results Summary`, 14, yPos);
            autoTable(doc, {
                startY: yPos + 10,
                head: [['Total Votes', 'Registered Voters', 'Turnout Percentage']],
                body: [[voteCount, approvedVoters, `${turnout}%`]],
                headStyles: { fillColor: [46, 204, 113] },
            });
        }

        // Provisional Watermark
        if (isProvisional) {
            doc.setFontSize(48);
            doc.setTextColor(200, 200, 200);
            doc.setGState(new doc.GState({ opacity: 0.3 }));
            doc.text('PROVISIONAL', 40, 140, { angle: 45 });
        }

        // Save PDF
        doc.save(`${election.title.replace(/ /g, '_')}_${isProvisional ? 'provisional' : 'final'}.pdf`);
    };

    //click handler for the export button
    const handleExportResults = async () => {
        const displayElection = selectedElectionId
            ? elections.find(e => e.id === selectedElectionId)
            : elections.find(e => e.status === 'active');

        if (!displayElection) {
            toast.error('No election available for export');
            return;
        }

        try {
            await generateElectionReport(displayElection);

            // Log audit event
            await logAuditEvent({
                action: 'election_results_exported',
                actorType: 'ec_member',
                ecMemberName: sessionStorage.getItem('ecAdminName') || 'Admin',
                electionId: displayElection.id,
                electionTitle: displayElection.title,
                additionalInfo: { format: 'PDF' }
            });

            toast.success('Report generated successfully!');
        } catch (error) {
            toast.error(`Failed to generate report!`);
        }
    };

    // Timestamp formatting function
    const formatTimestamp = (date) => {
        return date ? date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }) : 'N/A';
    };

    // Effect to detect new pending registrations
    useEffect(() => {
        // Compare current pending registrations with previous ones
        const currentIds = pendingRegistrations.map(r => r.id);
        const prevIds = prevPending.current.map(r => r.id);
        
        // Find new registrations that weren't in previous list
        const newIds = currentIds.filter(id => !prevIds.includes(id));
        
        if (newIds.length > 0) {
            setNewRequests(prev => {
                const updated = new Set(prev);
                newIds.forEach(id => updated.add(id));
                return updated;
            });
        }
        
        // Update ref with current pending registrations
        prevPending.current = pendingRegistrations;
    }, [pendingRegistrations]);

    // Clean up ref on component unmount
    useEffect(() => {
        return () => {
            prevPending.current = [];
        };
    }, []);

    // Logout handler function
    const handleLogout = useCallback(async () => {
        setIsLoggingOut(true);
    
        try {
            // Get admin name from sessionStorage
            const adminName = sessionStorage.getItem('ecAdminName');
      
            if (adminName) {
                await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: adminName }),
                });
            }
      
            // Clear session storage
            sessionStorage.removeItem('ecAdminName');
            sessionStorage.removeItem('ecAdminRole');
            sessionStorage.removeItem('ecAdminId');
            
            // Navigate to login page
            navigate('/');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Logout failed. Please try again.');
        } finally {
            setIsLoggingOut(false);
        }
    }, [navigate]);

    useEffect(() => {
        let inactivityTimer;

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(async () => {
            
            const adminName = sessionStorage.getItem('ecAdminName');

            await logAuditEvent({
                actorType: 'System',
                action: 'auto_logout',
                ecMemberName: adminName,
                additionalInfo: `${adminName} was logged out due to inactivity.`
            });

            
            toast.info('Session expired due to inactivity');

            // Clear session storage
            sessionStorage.removeItem('ecAdminName');
            sessionStorage.removeItem('ecAdminRole');

            // Navigate to login with a state indicating inactivity logout
            navigate('/', { 
                state: { 
                inactivityLogout: true,
                message: 'Your session has expired due to inactivity. Please log in again.' 
                } 
            });
            }, 30 * 60 * 1000); // 30 minutes of inactivity
        };

        // event listeners
        const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        resetTimer(); // Initialize timer

        return () => {
            clearTimeout(inactivityTimer);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [logAuditEvent, navigate]);

    // Check on initial load
    useEffect(() => {
        if (!sessionStorage.getItem('ecAdminName')) {
            navigate('/');
            toast.error('Please log in');
        }
    }, [navigate]);

    return (
        <>
            <div className={styles.toastWrapper}>
                <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                />
                {showSupportModal && (
                    <div className={styles.supportModalOverlay} onClick={() => setShowSupportModal(false)}>
                        <div className={styles.supportModal} onClick={(e) => e.stopPropagation()}>
                            <h3>Support Options</h3>
                            <button
                                className={styles.supportButton}
                                onClick={() => window.location.href = `mailto:?subject=Election%20Portal%20Support&body=${encodeURIComponent('Please describe your issue in detail:\n\nâ€¢ \nâ€¢ \nâ€¢ ')}`}
                            >
                                <i className="bx bx-envelope"></i> Contact IT Support
                            </button>
                            <button
                                className={styles.supportButton}
                                onClick={() => window.open(docsUrl, '_blank')}
                            >
                                <i className="bx bx-book"></i> Read Documentation
                            </button>
                            <button
                                className={styles.closeModalButton}
                                onClick={() => setShowSupportModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {showDeleteModal && (
                    <div className={styles.supportModalOverlay} onClick={() => setShowDeleteModal(false)}>
                        <div className={styles.supportModal} onClick={(e) => e.stopPropagation()}>
                        <h3>Confirm Deletion</h3>
                        <p>Are you sure you want to delete this election? This action cannot be undone.</p>
                        <div className={styles.modalButtons}>
                            <button 
                            className={styles.cancelButton}
                            onClick={() => setShowDeleteModal(false)}
                            >
                            Cancel
                            </button>
                            <button 
                            className={styles.confirmButton}
                            onClick={() => {
                                handleDeleteElection(electionToDelete);
                                setShowDeleteModal(false);
                            }}
                            >
                            Delete Election
                            </button>
                        </div>
                        </div>
                    </div>
                )}
            </div>
            <main className={styles.main}>
                {/* Navbar Section */}
                <section className={styles.navbarContainer}>
                    <nav className={styles.navbar}>
                        <h1 className={styles.navbarHeading}>E.C ADMIN PANEL</h1>
                        <div className={styles.navbarSearchbar}>
                            <i className="bx bx-search-alt"></i>
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className={styles.notificationBell}
                            onMouseEnter={() => setShowBellTooltip(true)}
                            onMouseLeave={() => setShowBellTooltip(false)}>
                            <i className="bx bx-bell"></i>
                            {newRequests.size > 0 && (
                                <span className={styles.notificationCounter}>
                                {newRequests.size}
                                </span>
                            )}
                            {showBellTooltip && newRequests.size > 0 && (
                                <div className={styles.notificationTooltip}>
                                {newRequests.size} new unseen request{newRequests.size !== 1 && 's'}
                                </div>
                            )}
                        </div>
                    </nav>
                </section>

                {/* Sidepanel Section */}
                <section className={styles.sidepanelContainer}>
                    <div className={styles.logo}>
                        <img src='/images/logo.png' alt="logo" />
                    </div>
                    <div className={styles.sidepanelNavigations}>
                        <ul className={styles.sidepanelNavigationsList}>
                            <li
                                data-target="elections"
                                className={activeSection === 'elections' ? styles.active : ''}
                                onClick={() => handleNavClick('elections')}>
                                <i className="bx bx-box"></i>Election Management
                            </li>
                            <li
                                data-target="voters"
                                className={activeSection === 'voters' ? styles.active : ''}
                                onClick={() => handleNavClick('voters')}>
                                <i className="bx bx-like"></i>Voter Management
                            </li>
                            <li
                                data-target="candidates"
                                className={activeSection === 'candidates' ? styles.active : ''}
                                onClick={() => handleNavClick('candidates')}>
                                <i className="bx bx-user-plus"></i>Candidate Management
                            </li>
                            <li
                                data-target="results"
                                className={activeSection === 'results' ? styles.active : ''}
                                onClick={() => handleNavClick('results')}>
                                <i className="bx bx-bar-chart"></i>Results & Analytics
                            </li>
                        </ul>
                    </div>
                    <hr />
                    <h1 className={styles.sidepanelMembersHeading}>EC Members</h1>
                    <div className={styles.sidepanelMembersPhoto}>
                        {ecMembers.slice(0, 3).map((member) => (
                            <div
                                key={member.id}
                                className={styles.sidepanelMembersPhotoList}
                                data-tooltip={member.name}
                            >
                                <div className={styles.memberAvatar}>
                                    {getInitials(member.name)}
                                </div>
                                <span className={styles.memberTooltip}>{`${member.name} - ${member.role}`}</span>
                            </div>
                        ))}
                        {ecMembers.length === 0 && (
                            <div className={styles.sidepanelMembersPhotoList}>
                                <div className={styles.memberAvatar}>EC</div>
                            </div>
                        )}
                    </div>
                    <div className={styles.sidepanelSettings}>
                        <ul className={styles.sidepanelSettingsList}>
                            <li role="button" onClick={() => setShowSupportModal(true)}>
                                <i className="bx bx-question-mark"></i>Support
                            </li>
                            <li role='button'
                                onClick={handleLogout}
                                disabled={isLoggingOut}>
                                <i className='bx bx-log-out-circle'></i>
                            {isLoggingOut ? 'Logging out...' : 'Logout'}
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Election Management Section */}
                {activeSection === 'elections' && (
                    <section className={styles.electionsContainer} id="election-mgt">
                        {isLoading ? (
                            <div className={styles.loaderContainer}>
                                <i className={`bx bx-download ${styles.downloadIcon}`}></i>
                            </div>
                        ) : (
                            <>
                                <h2 className={styles.electionsContainerHeading}>
                                    <i className="bx bx-message-square-detail">Overview</i>
                                </h2>
                                <div className={styles.electionsContainerCards}>
                                    <div className={styles.electionsContainerCardsContent}>
                                        <h3 className={styles.electionsContainerCardsHeading}>Upcoming Elections</h3>
                                        <p className={styles.electionsContainerCardsCount}>{electionStats.upcoming}</p>
                                    </div>
                                    <div className={styles.electionsContainerCardsContent}>
                                        <h3 className={styles.electionsContainerCardsHeading}>Active Elections</h3>
                                        <p className={styles.electionsContainerCardsCount}>{electionStats.active}</p>
                                    </div>
                                    <div className={styles.electionsContainerCardsContent}>
                                        <h3 className={styles.electionsContainerCardsHeading}>Recent Concluded Elections</h3>
                                        <p className={styles.electionsContainerCardsCount}>{recentCompleted}</p>
                                    </div>
                                </div>
                                <section className={styles.electionListContainer}>
                                    <h2 className={styles.electionListContainerHeading}>
                                        <i className="bx bx-list-ul">Elections List</i>
                                    </h2>
                                    <div className={styles.electionListContainerTable}>
                                        <table>
                                            <thead>
                                            <tr>
                                                <th>Election Title</th>
                                                <th>Start Date</th>
                                                <th>End Date</th>
                                                <th>TurnOut</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {(() => {
                                                // 1) filter based on searchQuery
                                                const filteredElections = elections.filter(e =>
                                                    e.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
                                                );

                                                // 2) show empty state if none match
                                                if (filteredElections.length === 0) {
                                                    return (
                                                        <tr>
                                                            <td colSpan="6" className={styles.emptyMessage}>
                                                                <i className="bx bx-info-circle"></i>
                                                                {searchQuery.trim()
                                                                    ? 'No elections found matching your search'
                                                                    : 'No elections scheduled'}
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                // 3) otherwise render the filtered list
                                                return filteredElections.map(election => (
                                                    <tr key={election.id}>
                                                        <td>{election.title}</td>
                                                        <td className={styles.startDate}>
                                                            {election.startTime?.toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            }) || 'Not scheduled'}
                                                        </td>
                                                        <td className={styles.duration}>
                                                            {election.endTime?.toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            }) || 'Not scheduled'}
                                                        </td>
                                                        <td>{getTurnoutData(election)}</td>
                                                        <td>
                                                            <span className={`${styles.status} ${styles[election.status]}`}>
                                                                {election.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={styles.tooltipContainer}>
                                                                <i
                                                                className={`bx ${
                                                                    selectedElectionId === election.id ? 'bx-x' : 'bx-show'
                                                                }`}
                                                                onClick={() => handleViewElection(election.id)}
                                                                />
                                                                <span className={styles.tooltipText}>
                                                                {selectedElectionId === election.id
                                                                    ? 'Show all elections'
                                                                    : 'View only this election'}
                                                                </span>
                                                            </span>
                                                            {election.status === 'upcoming' && (
                                                                <span>
                                                                    <span className={styles.tooltipContainer}>
                                                                        <i 
                                                                        className={`bx ${copiedElectionId === election.id ? 'bx-check' : 'bx-copy'}`}
                                                                        onClick={() => copyRegistrationLink(election.registration_link, election.id)}
                                                                        style={{
                                                                            color: copiedElectionId === election.id ? '#4CAF50' : 'inherit'
                                                                        }}
                                                                        />
                                                                        <span className={styles.tooltipText}>
                                                                        {copiedElectionId === election.id 
                                                                            ? 'Copied!' 
                                                                            : 'Copy registration link'}
                                                                        </span>
                                                                    </span>
                                                                    <span className={styles.tooltipContainer}>
                                                                        <i 
                                                                        className={`bx bx-trash`}
                                                                        onClick={() => {
                                                                            setElectionToDelete(election.id);
                                                                            setShowDeleteModal(true);
                                                                        }}
                                                                        style={{
                                                                            color: '#c0392b'
                                                                        }}
                                                                        />
                                                                        <span className={styles.tooltipText}>
                                                                        Delete election
                                                                        </span>
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ));
                                            })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                                <section className={styles.createNewElectionsContainer}>
                                    <div className={styles.createNewElectionsContainerBtn} id="newElections">
                                        <i className="bx bx-plus"></i>
                                        <button type="button" className={styles.createNewElectionsBtn}
                                                onClick={handleNewElectionsClick}>
                                            New Elections
                                        </button>
                                    </div>
                                </section>
                            </>
                        )}
                    </section>
                )}

                {/* Voter Management Section */}
                {activeSection === 'voters' && (
                    <section className={styles.voterMgtContainer} id="voter-mgt">
                        {isLoading ? (
                            <div className={styles.loaderContainer}>
                                <i className={`bx bx-download ${styles.downloadIcon}`}></i>
                            </div>
                        ) : (
                            <>
                                <h2 className={styles.voterMgtContainerHeading}>
                                    <i className="bx bx-user">Overview</i>
                                </h2>
                                <div className={styles.voterMgtContainerCards}>
                                    <div className={styles.voterMgtContainerCardsContent}>
                                        <h3 className={styles.voterMgtContainerCardsHeading}>New Requests</h3>
                                        <p className={styles.voterMgtContainerCardsCount}>{voterStats.pending}</p>
                                    </div>
                                    <div className={styles.voterMgtContainerCardsContent}>
                                        <h3 className={styles.voterMgtContainerCardsHeading}>Total Approved</h3>
                                        <p className={styles.voterMgtContainerCardsCount}>{voterStats.approved}</p>
                                    </div>
                                    <div className={styles.voterMgtContainerCardsContent}>
                                        <h3 className={styles.voterMgtContainerCardsHeading}>Rejected Registrants</h3>
                                        <p className={styles.voterMgtContainerCardsCount}>{voterStats.declined}</p>
                                    </div>
                                </div>
                                <section className={styles.voterListContainer}>
                                    <h2 className={styles.voterListContainerHeading}>
                                        <i className="bx bx-list-ul">Pending Approval</i>
                                        <i className={`${styles.adminActionInstruction} bx bx-info-circle`}>Actions are irreversible</i>
                                    </h2>
                                    <div className={styles.voterListContainerTable}>
                                        <table>
                                            <thead>
                                                <tr>
                                                <th>Registered At</th>
                                                <th>Email</th>
                                                <th>Election Title</th>
                                                <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                const q = searchQuery.trim().toLowerCase();
                                                const results = filteredPending.filter(reg =>
                                                    reg.email.toLowerCase().includes(q) ||
                                                    reg.electionTitle.toLowerCase().includes(q)
                                                );
                                                
                                                if (results.length === 0) {
                                                    return (
                                                    <tr>
                                                        <td colSpan="4" className={styles.emptyMessage}>
                                                        <i className="bx bx-info-circle"></i>
                                                        {q ? 'No matching registration requests' : 'No pending registration requests'}
                                                        </td>
                                                    </tr>
                                                    );
                                                }
                                                
                                                return results.map(registration => (
                                                    <tr 
                                                    key={registration.id}
                                                    onMouseEnter={() => setNewRequests(prev => {
                                                        const updated = new Set(prev);
                                                        updated.delete(registration.id);
                                                        return updated;
                                                    })}
                                                    >
                                                    <td>
                                                        {formatTimestamp(registration.registered_at)}
                                                        {newRequests.has(registration.id) && (
                                                        <span className={styles.newRequestIndicator} />
                                                        )}
                                                    </td>
                                                    <td className={styles.duration}>{registration.email}</td>
                                                    <td>{registration.electionTitle}</td>
                                                    <td>
                                                        <span className={styles.tooltipContainer} aria-label="Approve Voter">
                                                        {loadingRegistrationId === registration.id ? (
                                                            <div className={styles.spinner}></div>
                                                        ) : (
                                                            <i className={`bx bx-check-double ${styles.approveIcon}`}
                                                            onClick={() => handleApprove(registration.id)}
                                                            role="button"></i>
                                                        )}
                                                        <span className={styles.tooltipText}>
                                                            {loadingRegistrationId === registration.id ?
                                                            "Sending OTP..." : "Approve"}
                                                        </span>
                                                        </span>
                                                        <span className={styles.tooltipContainer} aria-label="Decline Voter">
                                                        <i className={`bx bx-trash ${styles.declineIcon}`}
                                                            onClick={() => !loadingRegistrationId && handleDecline(registration.id)}
                                                            role="button"
                                                            disabled={loadingRegistrationId === registration.id}></i>
                                                        <span className={styles.tooltipText}>Decline</span>
                                                        </span>
                                                    </td>
                                                    </tr>
                                                ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                                <section className={styles.voterListContainer}>
                                    <h2 className={styles.voterListContainerHeading}>
                                        <i className="bx bx-list-ul">Approved</i>
                                    </h2>
                                    <div className={styles.voterListContainerTable}>
                                        <table>
                                            <thead>
                                            <tr>
                                                <th>Approved At</th>
                                                <th>Email</th>
                                                <th>Election Title</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {filteredApproved.length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className={styles.emptyMessage}>
                                                        <i className="bx bx-info-circle"></i>
                                                        No approved registrations
                                                    </td>
                                                </tr>
                                            ) : filteredApproved.map(registration => (
                                                <tr key={registration.id}>
                                                    <td>{formatTimestamp(registration.approved_at)}</td>
                                                    <td className={styles.duration}>{registration.email}</td>
                                                    <td>{registration.electionTitle}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                                <section className={styles.voterListContainer}>
                                    <h2 className={styles.voterListContainerHeading}>
                                        <i className="bx bx-list-ul">Declined</i>
                                    </h2>
                                    <div className={styles.voterListContainerTable}>
                                        <table>
                                            <thead>
                                            <tr>
                                                <th>Declined At</th>
                                                <th>Email</th>
                                                <th>Election Title</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {filteredDeclined.length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className={styles.emptyMessage}>
                                                        <i className="bx bx-info-circle"></i>
                                                        No declined registrations
                                                    </td>
                                                </tr>
                                            ) : filteredDeclined.map(registration => (
                                                <tr key={registration.id}>
                                                    <td>{formatTimestamp(registration.rejected_at)}</td>
                                                    <td className={styles.duration}>{registration.email}</td>
                                                    <td>{registration.electionTitle}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </>
                        )}
                    </section>
                )}

                {/* Candidate Management Section */}
                {activeSection === 'candidates' && (
                    <section className={styles.candidateMgtContainer} id="candidate-mgt">
                        {isLoading ? (
                            <div className={styles.loaderContainer}>
                                <i className={`bx bx-download ${styles.downloadIcon}`}></i>
                            </div>
                        ) : (
                            <>
                                <h2 className={styles.candidateMgtContainerHeading}>
                                    <i className="bx bx-user-pin">Overview</i>
                                </h2>
                                <div className={styles.candidateMgtContainerCards}>
                                    <div className={styles.candidateMgtContainerCardsContent}>
                                        <h3 className={styles.candidateMgtContainerCardsHeading}>Total Candidates</h3>
                                        <p className={styles.candidateMgtContainerCardsCount}>{candidateStats.totalCandidates}</p>
                                    </div>
                                    <div className={styles.candidateMgtContainerCardsContent}>
                                        <h3 className={styles.candidateMgtContainerCardsHeading}>Total Positions</h3>
                                        <p className={styles.candidateMgtContainerCardsCount}>{candidateStats.uniquePositions}</p>
                                    </div>
                                    <div className={styles.candidateMgtContainerCardsContent}>
                                        <h3 className={styles.candidateMgtContainerCardsHeading}>Presidential candidates</h3>
                                        <p className={styles.candidateMgtContainerCardsCount}>{candidateStats.presidentialCandidates}</p>
                                    </div>
                                </div>
                                <section className={styles.candidaterListContainer}>
                                    <h2 className={styles.candidateListContainerHeading}>
                                        <i className="bx bx-group">Candidates List</i>
                                        {selectedElectionId && (
                                            <span className={styles.viewingOneElectionNote}>
                                                (Viewing only: {elections.find(e => e.id === selectedElectionId)?.title})
                                            </span>
                                        )}
                                    </h2>
                                    {/* Check if any candidates exist in all elections */}
                                    {(() => {
                                        const q = searchQuery.trim().toLowerCase();

                                        const electionsToDisplay = selectedElectionId
                                            ? elections.filter(e => e.id === selectedElectionId)
                                            : elections;

                                        // 1) is there any candidate in any election matching the query?
                                        const anyMatch = electionsToDisplay.some(election => 
                                            (election.candidates || []).some(candidate =>
                                                candidate.name.toLowerCase().includes(q) ||
                                                candidate.position.toLowerCase().includes(q)
                                            )
                                        );

                                        // 2) global empty state if nothing at all matched
                                        if (!anyMatch) {
                                            return (
                                                <div className={styles.emptyMessage}>
                                                    <i className="bx bx-info-circle"></i>
                                                    {q ? 'No candidates found' : 'No candidates available.'}
                                                </div>
                                            );
                                        }

                                        // 3) otherwise render each election with its filtered candidates
                                        return electionsToDisplay.map(election => {
                                            const filteredCandidates = (election.candidates || []).filter(candidate =>
                                                candidate.name.toLowerCase().includes(q) ||
                                                candidate.position.toLowerCase().includes(q)
                                            );

                                            // per-election empty state if this election has no matches
                                            if (filteredCandidates.length === 0) {
                                                return (
                                                    <div key={election.id} className={styles.emptyMessage}>
                                                        <i className="bx bx-info-circle"></i>
                                                        {q
                                                            ? `No candidates match in "${election.title}"`
                                                            : `No candidates for "${election.title}"`}
                                                    </div>
                                                );
                                            }

                                            // group and render the filteredCandidates just like before
                                            const grouped = filteredCandidates.reduce((acc, c) => {
                                                const pos = c.position.trim();
                                                (acc[pos] = acc[pos] || []).push(c);
                                                return acc;
                                            }, {});

                                            const positions = Object.keys(grouped).sort((a, b) => {
                                                if (a.toLowerCase() === 'president') return -1;
                                                if (b.toLowerCase() === 'president') return 1;
                                                return a.localeCompare(b);
                                            });

                                            return (
                                                <div key={election.id} className={styles.candidateListContainerTable}>
                                                    <h3 className={styles.electionTitle}>
                                                        {election.title} ({election.type})
                                                        <span className={styles.electionDates}>
                                                            {election.startTime?.toLocaleDateString()} - {election.endTime?.toLocaleDateString()}
                                                        </span>
                                                    </h3>
                                                    <table>
                                                        <thead>
                                                        <tr>
                                                            <th>Photo</th>
                                                            <th>Name</th>
                                                            <th>Position</th>
                                                        </tr>
                                                        </thead>
                                                        <tbody>
                                                        {positions.map(position => {
                                                            const sorted = grouped[position].sort((a, b) => a.name.localeCompare(b.name));
                                                            return (
                                                                <React.Fragment key={position}>
                                                                    <tr className={styles.positionHeader}>
                                                                        <td colSpan="3">
                                                                            {position} Candidates ({sorted.length})
                                                                        </td>
                                                                    </tr>
                                                                    {sorted.map((candidate, idx) => (
                                                                        <tr key={`${position}-${idx}`}>
                                                                            <td>
                                                                                <div className={styles.candidatePhoto}>
                                                                                    <img
                                                                                        src={candidate.photo || '/images/download.png'}
                                                                                        alt="candidate"
                                                                                        onError={e => { 
                                                                                            // Handle both relative and absolute paths
                                                                                            if (candidate.photo && !candidate.photo.startsWith('http')) {
                                                                                            e.target.src = `${process.env.REACT_APP_API_BASE_URL}${candidate.photo}`;
                                                                                            } else {
                                                                                            e.target.src = '/images/download.png';
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            </td>
                                                                            <td>{candidate.name}</td>
                                                                            <td className={styles.candidPos}>{candidate.position}</td>
                                                                        </tr>
                                                                    ))}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        });
                                    })()}
                                </section>
                            </>
                        )}
                    </section>
                )}

                {/* Analytics Section */}
                {activeSection === 'results' && (
                    <section className={styles.analyticsContainer} id="results">
                        {!isLoading ? (
                            <>
                                <h2 className={styles.analyticsContainerHeading}>
                                    <i className="bx bx-line-chart"></i>
                                    {selectedElectionId ? 'Election Results' : 'Live Election Analytics'}
                                </h2>
                                {(() => {
                                    const displayElection = selectedElectionId
                                        ? elections.find(e => e.id === selectedElectionId)
                                        : elections.filter(e => e.status === 'active')
                                            .sort((a, b) => b.createdAt - a.createdAt)[0];

                                    if (!displayElection) return <div className={styles.emptyMessage}>No election to display</div>;

                                    // Separate presidential candidates from others
                                    const presidentialCandidates = displayElection.candidates?.filter(c =>
                                        c.position.toLowerCase().includes('president')
                                    ) || [];

                                    const presidentialVotes = presidentialCandidates.reduce((sum, c) => sum + (candidateVotes[c.id] || 0), 0);
                                    const hasPresidentialVotes = presidentialVotes > 0;

                                    const otherPositions = displayElection.candidates?.reduce((acc, candidate) => {
                                        const position = candidate.position.trim();
                                        if (!position.toLowerCase().includes('president')) {
                                            acc[position] = acc[position] || [];
                                            acc[position].push({
                                                ...candidate,
                                                votes: candidateVotes[candidate.id] || 0
                                            });
                                        }
                                        return acc;
                                    }, {});

                                    const totalVotes = displayElection.voteCount || 0;

                                    return (
                                        <>
                                            <div className={styles.analyticsContainerCards}>
                                                <div className={styles.analyticsContainerCardsContent}>
                                                    <h3 className={styles.analyticsContainerCardsHeading}>Total Votes Cast</h3>
                                                    <p className={styles.analyticsContainerCardsCount}>{totalVotes}</p>
                                                </div>
                                                <div className={styles.analyticsContainerCardsContent}>
                                                    <h3 className={styles.analyticsContainerCardsHeading}>Voter Turnout</h3>
                                                    <p className={styles.analyticsContainerCardsCount}>
                                                        {getTurnoutData(displayElection).match(/\((.*?)\)/)?.[1] || '0%'}
                                                    </p>
                                                </div>
                                                <div className={styles.analyticsContainerCardsContent}>
                                                    <h3 className={styles.analyticsContainerCardsHeading}>Leading Candidate</h3>
                                                    <p className={styles.analyticsContainerCardsCount}>
                                                        {hasPresidentialVotes && presidentialCandidates.length > 0
                                                            ? presidentialCandidates.sort((a, b) =>
                                                                (candidateVotes[b.id] || 0) - (candidateVotes[a.id] || 0)
                                                            )[0].name
                                                            : 'No votes yet'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Charts for Presidential Position Only if Votes Exist */}
                                            {hasPresidentialVotes && presidentialCandidates.length > 0 ? (
                                                <div className={styles.chartsContainer}>
                                                    <div className={styles.chartCard}>
                                                        <h3><i className="bx bx-bar-chart-alt-2">Presidential Votes</i></h3>
                                                        <canvas ref={votesChartRef} width={400} height={300}></canvas>
                                                    </div>
                                                    <div className={styles.chartCard}>
                                                        <h3><i className="bx bx-pie-chart-alt-2">Vote Breakdown</i></h3>
                                                        <canvas ref={demographicChartRef}></canvas>
                                                    </div>
                                                    <div className={styles.chartCard}>
                                                        <h3><i className="bx bx-line-chart-alt-2">Hourly Turnout</i></h3>
                                                        <canvas ref={turnoutChartRef}></canvas>
                                                    </div>
                                                </div>
                                            ) : presidentialCandidates.length > 0 ? (
                                                <div className={styles.emptyMessage}>No votes recorded for presidential candidates</div>
                                            ) : null}

                                            {/* Tables for Other Positions */}
                                            {Object.keys(otherPositions || {}).length > 0 && (
                                                <div className={styles.resultsTablesContainer}>
                                                    <h3 className={styles.resultsTableHeading}>Other Position Results</h3>
                                                    {Object.entries(otherPositions).map(([position, candidates]) => {
                                                        const positionVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
                                                        const hasPositionVotes = positionVotes > 0;

                                                        return (
                                                            <div key={position} className={styles.positionTableWrapper}>
                                                                <h4 className={styles.positionTitle}>
                                                                    {position} ({candidates.length} Candidates)
                                                                </h4>
                                                                <table className={styles.resultsTable}>
                                                                    <thead>
                                                                    <tr>
                                                                        <th>Candidate</th>
                                                                        <th>Votes</th>
                                                                        {displayElection.status === 'completed' && <th>Percentage</th>}
                                                                    </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                    {candidates.sort((a, b) => b.votes - a.votes).map(candidate => (
                                                                        <tr key={candidate.id}>
                                                                            <td>{candidate.name}</td>
                                                                            <td>{candidate.votes}</td>
                                                                            {displayElection.status === 'completed' && (
                                                                                <td>
                                                                                    {hasPositionVotes
                                                                                        ? `${((candidate.votes / positionVotes * 100).toFixed(1))}%`
                                                                                        : '0%'}
                                                                                </td>
                                                                            )}
                                                                        </tr>
                                                                    ))}
                                                                    {!hasPositionVotes && displayElection.status === 'completed' && (
                                                                        <tr>
                                                                            <td colSpan={3} className={styles.emptyMessage}>
                                                                                No votes recorded for this position
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Export Button */}
                                            <section className={styles.exportResultsContainer}>
                                                <div className={styles.exportResultsContainerBtn} id="exportResults">
                                                    <i className="bx bx-download"></i>
                                                    <button type="button" className={styles.exportResultsBtn}
                                                            onClick={handleExportResults}>
                                                        Export Results
                                                    </button>
                                                </div>
                                            </section>
                                        </>
                                    );
                                })()}
                            </>
                        ) : (
                            <div className={styles.loaderContainer}>
                                <i className={`bx bx-download ${styles.downloadIcon}`}></i>
                            </div>
                        )}
                    </section>
                )}
            </main>
        </>
    );
};

export default Dashboard;