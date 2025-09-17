import React, { useState, useEffect } from "react";
import { useSearchParams } from 'react-router-dom';
import styles from './voterVotes.module.css';
import { useNavigate } from 'react-router-dom';

const VoterVotes = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const electionId = searchParams.get('electionId');

    const [selectedPosition, setSelectedPosition] = useState(null);
    const [electionData, setElectionData] = useState(null);
    const [votes, setVotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(null);
    const [electionEnded, setElectionEnded] = useState(false);
    const [isVoting, setIsVoting] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });

    // Show notification and auto-hide after 5 seconds
    const showNotification = (message, type = 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 5000);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch election data from API
                const electionResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/elections/${electionId}`);
                if (!electionResponse.ok) throw new Error('Failed to fetch election');
                const electionData = await electionResponse.json();

                setElectionData({
                    ...electionData,
                    endTimestamp: new Date(electionData.end_time)
                });

                // Fetch existing votes from API
                const voterEmail = sessionStorage.getItem('voterEmail');
                const votesResponse = await fetch(
                    `${process.env.REACT_APP_API_BASE_URL}/vote?electionId=${electionId}&voterEmail=${encodeURIComponent(voterEmail)}`
                );
                
                if (!votesResponse.ok) throw new Error('Failed to fetch votes');
                const votesData = await votesResponse.json();
                setVotes(votesData.map(vote => vote.candidate_id));

            } catch (err) {
                if (err.message.includes(err.message) || err.message.includes('Invalid')) {
                    navigate('/notFound');
                } else {
                    showNotification('Failed to load election data. Please try again.', 'error');
                    setError('Failed to load election data');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [electionId, navigate]);

    useEffect(() => {
    if (!electionData?.endTimestamp) return;

        const calculateTimeLeft = () => {
            // Convert string timestamp to Date object
            const endTime = new Date(electionData.endTimestamp);
            const now = new Date();
            const difference = endTime - now;

            if (difference <= 0) {
                setElectionEnded(true);
                return null;
            }

            // Rest of the calculation remains the same
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            return { days, hours, minutes, seconds };
        };

        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            if (newTimeLeft === null) {
                clearInterval(timer);
                setElectionEnded(true);
                showNotification('The election has ended. Voting is no longer allowed.', 'info');
            } else {
                setTimeLeft(newTimeLeft);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [electionData]);

    const getUniquePositions = () => {
        return [...new Set(electionData?.candidates?.map(c => c.position))] || [];
    };

    const handleVote = async (candidateId) => {
        try {
            setIsVoting(true);
            const voterEmail = sessionStorage.getItem('voterEmail');
            if (!voterEmail) {
                showNotification('Your voting session has expired. Please register again.', 'error');
                return;
            }
            
            if (electionEnded) {
                showNotification('The election has ended. Voting is no longer allowed.', 'error');
                return;
            }

            // Submit vote through API
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                electionId,
                candidateId,
                voterEmail: voterEmail.toLowerCase()
            })
            });

            if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error || 'Voting failed';
            
            if (errorMessage.includes('position') || errorMessage.includes('already voted')) {
                showNotification('You have already voted for this position. Each position allows only one vote.', 'warning');
            } else if (errorMessage.includes('election ended')) {
                showNotification('The election has ended. Voting is no longer allowed.', 'error');
            } else {
                showNotification('Failed to submit your vote. Please try again.', 'error');
            }
            
            throw new Error(errorMessage);
            }

            setVotes(prev => [...prev, candidateId]);
            showNotification('Vote recorded successfully!', 'success');

        } catch (error) {
            console.error('Voting failed:', error);
        } finally {
            setIsVoting(false);
        }
    };

    const hasVotedForPosition = (position) => {
        return electionData?.candidates?.some(candidate =>
            candidate.position === position && votes.includes(candidate.id)
        );
    };

    const allPositionsVoted = votes.length === getUniquePositions().length;

    const handleDone = () => {
        setIsSubmitting(true);
        // Clear session immediately
        sessionStorage.removeItem('voterEmail');
        setShowThankYou(true);
        setIsSubmitting(false);
    };

    if (loading) {
        return (
            <main className={styles.mainContainer}>
                <div className={styles.loading}>
                    <div className={styles.loadingSpinner}></div>
                    <div className={styles.loadingText}>Loading election data...</div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className={styles.mainContainer}>
                <div className={styles.errorMessage}>
                    <h2>Error</h2>
                    <p>{error}</p>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.mainContainer}>
            {/* Notification Banner */}
            {notification.message && (
                <div className={`${styles.notification} ${styles[notification.type]}`}>
                    {notification.message}
                    <button 
                        className={styles.notificationClose}
                        onClick={() => setNotification({ message: '', type: '' })}
                    >
                        ×
                    </button>
                </div>
            )}
            
            {showThankYou ? (
                <div className={styles.thankYouDialog}>
                    <div className={styles.dialogContent}>
                        <h2>Vote Recorded Successfully</h2>
                        <p>Your ballot has been securely stored.</p>
                        <p>No receipt is provided to protect your privacy.</p>
                    </div>
                </div>
            ) : (
                <>
                    {loading ? (
                        <div className={styles.loading}>
                            <div className={styles.loadingSpinner}></div>
                            <div className={styles.loadingText}>Loading election data...</div>
                        </div>
                    ) : error ? (
                        <div className={styles.errorMessage}>
                            <h2>Error</h2>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <section>
                            <div className={styles.logo}>
                                <img src="images/logo.png" alt="logo" />
                            </div>
                            <div className={styles.timer}>
                                {electionEnded ? (
                                    <p className={styles.electionEnded}>Election has ended</p>
                                ) : timeLeft ? (
                                    <p className={styles.countdown}>
                                        Time remaining: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                                    </p>
                                ) : (
                                    <div className={styles.loading}>
                                        <div className={styles.loadingSpinner}></div>
                                        <div className={styles.loadingText}>Preparing election timer...</div>
                                    </div>
                                )}
                            </div>
                            <h1>{electionData?.title} - Voting Portal</h1>
                            {!selectedPosition ? (
                                <div className={styles.OpenPositionsContainer}>
                                    <h2 className={styles.OpenPositionsContainerHeading}>Available Positions</h2>
                                    <div className={styles.OpenPositionsContainerCards}>
                                        {getUniquePositions().map((position) => (
                                            <div key={position} className={styles.OpenPositionsContainerCard}>
                                                <h4>{position}</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedPosition(position)}
                                                    disabled={electionEnded || hasVotedForPosition(position)}
                                                >
                                                    <i className='bx bx-door-open'></i>
                                                    {hasVotedForPosition(position) ? "Already Voted" : "View Candidates"}
                                                </button>
                                                {hasVotedForPosition(position) && (
                                                    <div className={styles.votedBadge}>
                                                        <i className='bx bx-check-circle'></i>
                                                        Voted
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.CandidatesContainer}>
                                    <h3 className={styles.candidatesHeading}>
                                        <button
                                            className={styles.backButton}
                                            onClick={() => setSelectedPosition(null)}
                                        >
                                            <i className='bx bx-arrow-back'></i>
                                        </button>
                                        Candidates for {selectedPosition}
                                    </h3>
                                    <p className={styles.votingInstruction}>Your vote is final - choose carefully</p>
                                    {hasVotedForPosition(selectedPosition) && (
                                        <div className={styles.alreadyVotedNotice}>
                                            <i className='bx bx-info-circle'></i>
                                            You've already voted for this position
                                        </div>
                                    )}
                                    <div className={styles.candidatesSection}>
                                        <div className={styles.candidatesGrid}>
                                            {electionData?.candidates
                                                ?.filter(c => c.position === selectedPosition)
                                                ?.map(candidate => (
                                                    <div key={candidate.id} className={styles.candidateCard}>
                                                        <div className={styles.candidateImage}>
                                                            <img
                                                                src={candidate.photo}
                                                                alt={candidate.name}
                                                                onError={(e) => {
                                                                    e.target.src = '/images/placeholder.png';
                                                                }}
                                                            />
                                                        </div>
                                                        <h4 className={styles.candidateName}>{candidate.name}</h4>
                                                        <div className={styles.candidateSlogan}>
                                                            {candidate.slogan}
                                                        </div>
                                                        <button
                                                            className={
                                                                votes.includes(candidate.id)
                                                                    ? styles.voteButtonVoted
                                                                    : hasVotedForPosition(selectedPosition)
                                                                        ? styles.voteButtonDisabled
                                                                        : styles.voteButton
                                                            }
                                                            disabled={electionEnded || hasVotedForPosition(selectedPosition) ||
                                                                votes.includes(candidate.id) || isVoting}
                                                            onClick={() => handleVote(candidate.id)}
                                                        >
                                                            {isVoting ? (
                                                                <div className={styles.miniSpinner}></div>
                                                            ) : (
                                                                <>
                                                                    <i className='bx bx-check'></i>
                                                                    {votes.includes(candidate.id) ? "Voted" : "Vote"}
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!selectedPosition && (
                                <div className={styles.doneSection}>
                                    <button
                                    className={styles.doneButton}
                                    onClick={handleDone}
                                    disabled={!allPositionsVoted || isSubmitting}
                                    >
                                    {isSubmitting ? (
                                        <div className={styles.miniSpinner}></div>
                                    ) : (
                                        'Finish Voting'
                                    )}
                                    </button>
                                    {!allPositionsVoted && (
                                        <p className={styles.incompleteNotice}>
                                            Please vote for all positions before finishing
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>
                    )}
                </>
            )}
        </main>
    );
};

export default VoterVotes;