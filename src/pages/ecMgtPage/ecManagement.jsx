import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './ecManagement.module.css';
import 'boxicons/css/boxicons.min.css';

const ECManagement = () => {
    const [members, setMembers] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        role: 'chairperson',
        pin: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [deleteCandidate, setDeleteCandidate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [auditTrails, setAuditTrails] = useState([]);
    const [elections, setElections] = useState([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [globalActions, setGlobalActions] = useState([]);
    const [passwordVisibility, setPasswordVisibility] = useState({});
    const [refreshCounter, setRefreshCounter] = useState(0);

    // Action types for display
    const ACTION_TYPES = {
        EC_LOGIN: 'EC Login',
        EC_LOGOUT: 'EC Logout',
        REGISTRATION_APPROVED: 'Registration Approved',
        REGISTRATION_REJECTED: 'Registration Rejected',
        ELECTION_CREATED: 'Election Created',
        VOTER_REGISTERED: 'Voter Registered',
        VOTER_VOTED: 'Voter Voted',
        ELECTION_RESULTS_EXPORTED: 'Election Results Exported',
        ELECTION_VIEWED: 'Election Viewed',
        EC_MEMBER_CREATED: 'EC Member Created',
        EC_MEMBER_DELETED: 'EC Member Deleted',
        ELECTION_AUTO_DELETED: 'Election Auto-Deleted'
    };

    // Fetch existing EC members
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/ec-members`);

                if (!response.ok) throw new Error('Failed to fetch members');
                const data = await response.json();
                setMembers(data);

                // Initialize password visibility state
                const visibilityState = {};
                data.forEach(member => {
                    visibilityState[member.id] = false;
                });
                setPasswordVisibility(visibilityState);
            } catch (error) {
                toast.error('Failed to load members');
                console.error('Fetch error:', error);
            }
        };
        fetchMembers();
    }, []);

    // Fetch elections and audit trails
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch elections
                const electionsResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/elections`);
                if (!electionsResponse.ok) throw new Error('Failed to fetch elections');
                const electionsData = await electionsResponse.json();
                setElections(electionsData);
                
                // Fetch all audit trails
                setAuditLoading(true);
                const auditResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/audit`);
                if (!auditResponse.ok) throw new Error('Failed to fetch audit trails');
                const auditData = await auditResponse.json();

                // Separate global actions (no electionId)
                const global = auditData.filter(trail => !trail.election_id);
                const electionSpecific = auditData.filter(trail => trail.election_id);

                setAuditTrails(electionSpecific);
                setGlobalActions(global);
            } catch (error) {
                toast.error('Failed to load data');
                console.error('Fetch error:', error);
            } finally {
                setAuditLoading(false);
            }
        };
        fetchData();
    }, [refreshCounter]);

    // time interval to trigger refreshes
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshCounter(prev => prev + 1);
        }, 60000); // Update every 60 seconds

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    // Generate random credentials
    const generateCredentials = () => {
        const pin = Math.floor(1000 + Math.random() * 9000);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const password = Array.from({ length: 6 }, () =>
            chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('');

        setFormData(prev => ({ ...prev, pin, password }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            if (!formData.name.trim() || !formData.role) {
                toast.error('Please fill all required fields');
                setLoading(false);
                return;
            }

            const roleAlreadyExists = members.some(member => 
                member.role === formData.role
            );
            
            if (roleAlreadyExists) {
                toast.error(`${formData.role} role is already assigned!`);
                setLoading(false);
                return;
            }

            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/ec-members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save member');
            }

            const newMember = await response.json();
            setMembers(prev => [{
                ...newMember,
                password: formData.password
            }, ...prev]);

            // Set password visibility for new member
            setPasswordVisibility(prev => ({
                ...prev,
                [newMember.id]: false
            }));

            setFormData({ name: '', role: 'chairperson', pin: '', password: '' });
            toast.success('Member saved successfully');

        } catch (err) {
            toast.error('Failed to save member');
        } finally {
            setLoading(false);
        }
    };

    // Toggle password visibility for a specific member
    const togglePasswordVisibility = (memberId) => {
        setPasswordVisibility(prev => ({
            ...prev,
            [memberId] : !prev[memberId]
        }));
    };

    const confirmDelete = async () => {
        if (!deleteCandidate) return;

        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/ec-members/${deleteCandidate}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete member');
            }

            setMembers(prev => prev.filter(member => member.id !== deleteCandidate));
            setDeleteCandidate(null);
            setShowModal(false);
            toast.success('Member deleted successfully');

        } catch (err) {
            toast.error('Failed to delete member, Try again!');
        }
    };

    // helper function to safely format additional info
    const getSafeAdditionalInfo = (trail) => {
        if (!trail.additional_info) return '-';
    
        // Format date
        const formatDate = (dateString) => {
            if (!dateString) return 'Unknown';
            try {
                const date = new Date(dateString);
                return date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch {
                return dateString; // Fallback to original if parsing fails
            }
        };

        //  EC_MEMBER_CREATED actions
        if (trail.action === 'ec_member_created') {
            const safeInfo = {...trail.additional_info};
            if (safeInfo.newMember) {
                const {id, pin, password, created_at, ...safeNewMember} = safeInfo.newMember;
                safeInfo.newMember = {
                    ...safeNewMember,
                    created_at: formatDate(created_at) // Format the date
                };
            }
            return Object.keys(safeInfo).length > 0 
            ? JSON.stringify(safeInfo, null, 2) // print with 2-space indentation
            : '-';
        }

        //  EC_MEMBER_DELETED actions
        if (trail.action === 'ec_member_deleted') {
            const safeInfo = {...trail.additional_info};
            if (safeInfo.deletedMember) {
                const {id, pin, password, created_at, ...safeDeletedMember} = safeInfo.deletedMember;
                safeInfo.deletedMember = {
                    ...safeDeletedMember,
                    created_at: formatDate(created_at)
                };
            }
            return Object.keys(safeInfo).length > 0 
            ? JSON.stringify(safeInfo, null, 2)
            : '-';
        }

        // ELECTION_AUTO_DELETED actions
        if (trail.action === 'election_auto_deleted') {
            const safeInfo = {...trail.additional_info};
            if (safeInfo.deletion_time) {
                safeInfo.deletion_time = formatDate(safeInfo.deletion_time);
            }
            return Object.keys(safeInfo).length > 0 
            ? JSON.stringify(safeInfo, null, 2)
            : '-';
        }

        return JSON.stringify(trail.additional_info, null, 2);
    };

    // Generate PDF for a specific election's audit trails
    const generateElectionPDF = (electionId) => {
        const election = elections.find(e => e.id === electionId);
        if (!election) return;
    
        const electionTrails = auditTrails.filter(trail => trail.election_id === electionId);
        if (electionTrails.length === 0) {
            toast.info('No audit trails found for this election');
            return;
        }

        // Sort trails by time (newest first) - THIS WAS MISSING
        const sortedTrails = [...electionTrails].sort((a, b) => 
            new Date(b.event_time) - new Date(a.event_time)
        );

        const doc = new jsPDF();
        const title = `Audit Report for ${election.title}`;
    
        // Determine report type
        const now = new Date();
        const startDate = new Date(election.start_time);
        const endDate = new Date(election.end_time);
        
        let watermarkText = '';
        if (now < startDate) {
            watermarkText = 'PRE-ELECTION AUDIT REPORT';
        } else if (now > endDate) {
            watermarkText = 'POST-ELECTION AUDIT REPORT';
        } else {
            watermarkText = 'ELECTION IN PROGRESS AUDIT REPORT';
        }

        // Add watermark function
        const addWatermark = (doc) => {
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                // Set watermark properties
                doc.setTextColor(200, 200, 200);
                doc.setFontSize(30);
                doc.setFont("Patrick-hand", "bold");
                
                // Get page dimensions
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                
                // Calculate centered position
                const textWidth = doc.getStringUnitWidth(watermarkText) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                const x = (pageWidth - textWidth) / 2;
                const y = pageHeight / 2;
                
                // Draw watermark
                doc.text(watermarkText, x, y);
            }
        };

        // Main content
        doc.setFontSize(16);
        doc.text(title, 14, 20);
        
        const tableData = sortedTrails.map(trail => [
            new Date(trail.event_time).toLocaleString(),
            ACTION_TYPES[trail.action] || trail.action,
            trail.ec_member_name || '-',
            trail.voter_email || '-',
            getSafeAdditionalInfo(trail)
        ]);

        autoTable(doc, {
            head: [['Time', 'Action', 'EC Member', 'Voter Email', 'Additional Info']],
            body: tableData,
            startY: 30,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] },
            didDrawPage: () => {
            addWatermark(doc);
            }
        });

        doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
    };

    const generateGlobalPDF = () => {
        if (globalActions.length === 0) {
            toast.info('No system-wide actions found');
            return;
        }
    
        // Sort trails by time (newest first)
        const sortedTrails = [...globalActions].sort((a, b) => 
            new Date(b.event_time) - new Date(a.event_time)
        );
    
        const doc = new jsPDF();
        const title = `System-Wide Audit Report`;
    
        doc.setFontSize(16);
        doc.text(title, 14, 20);
    
        const tableData = sortedTrails.map(trail => [
            new Date(trail.event_time).toLocaleString(),
            ACTION_TYPES[trail.action] || trail.action,
            trail.actor_type || '-',
            trail.ec_member_name || '-',
            trail.voter_email || '-',
            getSafeAdditionalInfo(trail)  //safe helper function to format additional info
        ]);

        autoTable(doc, {
            head: [['Time', 'Action', 'Actor Type', 'EC Member', 'Voter Email', 'Additional Info']],
            body: tableData,
            startY: 30,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] }
        });

        doc.save('System_Wide_Audit_Report.pdf');
    };

    // Get last action time for an election
    const getLastActionTime = (electionId) => {
        const electionTrails = auditTrails.filter(trail => trail.election_id === electionId);
        if (electionTrails.length === 0) return 'No actions';
        
        const latest = electionTrails.reduce((latestTrail, currentTrail) => {
            const currentTime = new Date(currentTrail.event_time);
            return currentTime > new Date(latestTrail.event_time) ? currentTrail : latestTrail;
        }, electionTrails[0]);
        
        return new Date(latest.event_time).toLocaleString();
    };

    // Get unique elections from audit trails
    const getUniqueElections = () => {
        const uniqueElectionIds = [...new Set(auditTrails.map(trail => trail.election_id))];
        return uniqueElectionIds.map(id => {
            const election = elections.find(e => e.id === id);
            return {
                id,
                title: election?.title || `Election ${id.substring(0, 8)}`,
                lastActionTime: getLastActionTime(id)
            };
        });
    };

    return (
        <>
            <h1 className={styles.heading}>For I.T personnel use only</h1>
            <main className={styles.main}>
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
                <div className={styles.formContainer}>
                    <h2 className={styles.text}>EC Member Management</h2>

                    {showModal && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <h3>Confirm Deletion</h3>
                                <p>Are you sure you want to delete this EC member?</p>
                                <div className={styles.modalActions}>
                                    <button
                                        className={styles.cancelBtn}
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={styles.confirmDeleteBtn}
                                        onClick={confirmDelete}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className={styles.textbox2}>
                            <label>Full Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className={styles.dropdown}>
                            <label>Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="chairperson">Chairperson</option>
                                <option value="1st deputy">1st Deputy</option>
                                <option value="2nd deputy">2nd Deputy</option>
                            </select>
                        </div>

                        <button type="button" onClick={generateCredentials} className={styles.allBtn}>
                            Generate Credentials
                        </button>

                        <div className={styles.textbox3}>
                            <label>PIN:</label>
                            <input type="text" value={formData.pin} readOnly />
                        </div>
                        <div className={styles.textbox4}>
                            <label>Password:</label>
                            <input type="text" value={formData.password} readOnly />
                        </div>

                        <button type="submit" disabled={loading} className={styles.allBtn}>
                            {loading ? 'Saving...' : 'Save Member'}
                        </button>
                    </form>

                    <div className={styles.membersTable}>
                        <h2 className={styles.text}>Existing EC Members</h2>
                        <div className={styles.tableWrapper}>
                            <table>
                                <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>PIN</th>
                                    <th>Password</th>
                                    <th>Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {members.map(member => (
                                    <tr key={member.id}>
                                        <td>{member.name}</td>
                                        <td>{member.role}</td>
                                        <td>{member.pin}</td>
                                        <td>
                                            {passwordVisibility[member.id] ? 
                                                member.password : 
                                                '••••••'
                                            }
                                            <span
                                                onClick={() => togglePasswordVisibility(member.id)}
                                            >
                                                {passwordVisibility[member.id] ? (
                                                    <i className='bx bxs-show' style={{ cursor: 'pointer' }}></i>
                                                ) : (
                                                    <i className='bx bxs-hide' style={{ cursor: 'pointer' }}></i>
                                                )}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => {
                                                    setDeleteCandidate(member.id);
                                                    setShowModal(true);
                                                }}
                                                className={styles.deleteBtn}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {members.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className={styles.noMembers}>
                                            No EC members found
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>                    
                </div>

                <div className={styles.auditContainer}>
                    <h2 className={styles.text}>Audit Trails</h2>
                    {/*Global Actions Section */}
                    <div className={styles.globalActionsSection}>
                    <h3>System-Wide Actions</h3>
                        <button 
                            onClick={generateGlobalPDF}
                            className={styles.downloadBtn}
                            disabled={globalActions.length === 0}
                        >
                            Download Global PDF
                            <i className='bx bx-download'></i>
                        </button>
                    <p>Actions: {globalActions.length}</p>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Election Title</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLoading ? (
                                    <tr>
                                        <td colSpan="3" className={styles.noMembers}>
                                            Loading audit trails...
                                        </td>
                                    </tr>
                                ) : getUniqueElections().length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className={styles.noMembers}>
                                            No audit trails found
                                        </td>
                                    </tr>
                                ) : (
                                    getUniqueElections().map(election => (
                                        <tr key={election.id}>
                                            <td>{election.lastActionTime}</td>
                                            <td>{election.title}</td>
                                            <td>
                                                <button 
                                                    onClick={() => generateElectionPDF(election.id)}
                                                    className={styles.downloadBtn}
                                                >
                                                    Download PDF
                                                    <i className='bx bx-download'></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </>
    );
};

export default ECManagement;