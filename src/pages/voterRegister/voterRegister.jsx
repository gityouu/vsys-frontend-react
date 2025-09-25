import React, { useState, useEffect, useCallback } from "react";
import styles from "./voterRegister.module.css";
import 'boxicons/css/boxicons.min.css';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const VoterRegister = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const electionId = searchParams.get('electionId');
    const token = searchParams.get('token');
    const [otpRecord, setOtpRecord] = useState(null);

    const [electionData, setElectionData] = useState(null);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [status, setStatus] = useState("checking");
    const [otp, setOtp] = useState('');

    // Fetch election data from API
    useEffect(() => {
        const fetchElection = async () => {
            try {
                if (!electionId) throw new Error('Invalid link');
                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/elections/${electionId}`);
                if (!response.ok) throw new Error('Election not found');
                const data = await response.json();
                setElectionData({
                    ...data,
                    createdAt: new Date(data.created_at),
                    startTime: new Date(data.start_time),
                    endTime: new Date(data.end_time)
                });
            } catch (err) {
                navigate('/notFound');
            } finally {
                setLoading(false);
            }
        };
        fetchElection();
    }, [electionId, navigate]);

    // Fetch OTP record from API when token is present
    useEffect(() => {
        const fetchOtpRecord = async () => {
            if (!token) return;
            try {
                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/voter/otps/${token}?electionId=${electionId}`);
                if (!response.ok) throw new Error('Invalid or expired link');
                const data = await response.json();
                setOtpRecord(data);
            } catch (err) {
                setError(err.message);
            }
        };
        fetchOtpRecord();
    }, [token, electionId]);

    // Handle registration via API
    const handleRegistration = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');
        try {
            const emailRegex = /^[^\s@]+@hcuc\.edu\.gh$/i;
            if (!emailRegex.test(email)) {
                toast.error('Please use your school email address.');
                return;
            }

            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/voter/registrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ electionId, email: email.toLowerCase() })
            });

            if (!response.ok) {
                const errorData = await response.json();
                toast.error('Registration failed' || errorData.error);
                return;
            }

            setMessage('Registration successful! You will receive an OTP once approved.');
            toast.success('Registration successful! You will receive an OTP once approved.');
            setIsRegistered(true);
        } catch (err) {
            setMessage(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle OTP change (6-character alphanumeric)
    const handleOtpChange = (e) => {
        const newVal = e.target.value.toUpperCase().slice(0, 6);
        setOtp(newVal);
    };

    // Handle OTP submission via API
    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');
        try {
            const now = new Date();
            if (now < electionData.startTime) {
                toast.error('Voting has not started yet');
                return;
            }
            if (now > electionData.endTime) {
                toast.error('Voting has ended');
                return;
            }
            if (!otpRecord) {
                toast.error('Invalid session. Please use a valid registration link.');
                return;
            }

            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/voter/otps/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ electionId, token, code: otp })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Invalid OTP');
            }

            const data = await response.json();
            sessionStorage.setItem('voterEmail', data.email);
            navigate(`/voterVotes?electionId=${electionId}`);
        } catch (err) {
            setMessage(err.message);
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Clock and status logic (unchanged)
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!electionData) return;
        
        const now = new Date();
        const electionStart = new Date(electionData.startTime);
        const electionEnd = new Date(electionData.endTime);
        
        if (token) {
            setStatus(now < electionStart ? 'preElection'
            : now <= electionEnd ? 'election' : 'ended');
        } else {
            const rs = new Date(electionData.createdAt);
            rs.setMinutes(rs.getMinutes() + 15);
            const re = new Date(electionStart);
            re.setMinutes(re.getMinutes() - 15);
            
            setStatus(
            now < rs ? 'pending'
                : now <= re ? 'registration'
                : now < electionEnd ? 'preElection'
                    : 'ended'
            );
        }
    }, [currentTime, electionData, token]);

    const CountdownTimer = ({ targetDate }) => {
        const [timeLeft, setTimeLeft] = useState({});

        const calculateTimeLeft = useCallback(() => {
            const difference = targetDate - new Date();
            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                };
            }
            return {};
        }, [targetDate]);

        useEffect(() => {
            setTimeLeft(calculateTimeLeft());
            const timer = setInterval(() => {
                setTimeLeft(calculateTimeLeft());
            }, 1000);

            return () => clearInterval(timer);
        }, [calculateTimeLeft]);

        return (
            <span>
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
            </span>
        );
    };

    if (loading)
        return <main className={styles.mainContainer}>
            <div className={styles.loading}>Loading...</div>
        </main>;

    if (error){
        navigate('/notFound');
    }

    const registrationStart = new Date(electionData.createdAt);
    registrationStart.setMinutes(registrationStart.getMinutes() + 15);
    const registrationEnd = new Date(electionData.startTime);
    registrationEnd.setMinutes(registrationEnd.getMinutes() - 15);

    return (
        <main className={styles.mainContainer}>
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
            {status === 'checking' && <div className={styles.loading}>Verifying election status...</div>}

            {/* Registration flow if no token */}
            {!token && (
                <>
                    {status === 'pending' && (
                        <div className={styles.statusMessage}>
                            <div className={styles.statusImage}>
                                <img 
                                    src="/images/logo.png" 
                                    alt="Registration pending"
                                />
                            </div>
                            <h2>Registration Pending</h2>
                            <p>Registration opens on {registrationStart.toLocaleString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                month: 'short',
                                day: 'numeric'
                            })}</p>
                        </div>
                    )}
                    {status === 'registration' && (
                        <div className={styles.formContainer}>
                            <div className={styles.statusImage}>
                                <img 
                                    src="/images/logo.png" 
                                    alt="Registration pending"
                                />
                            </div>
                            <form onSubmit={handleRegistration} className={styles.form}>
                                <h1 className={styles.formHeading}>{electionData.title} Registration</h1>
                                {message &&
                                    <div className={message.includes('success') ? styles.successMessage : styles.errorMessage}>
                                        {message}
                                    </div>}
                                {!isRegistered && <>
                                    <p className={styles.formInstruction}>Closes {registrationEnd.toLocaleString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        month: 'short',
                                        day: 'numeric'
                                    })}</p>
                                    <div className={styles.inputGroup}><i className='bx bx-envelope'></i>
                                        <input type='email' placeholder='Enter your school email' className={styles.formInput}
                                               value={email} onChange={e => setEmail(e.target.value)} disabled={isSubmitting} required />
                                    </div>
                                    <button type='submit' className={styles.formButton}
                                            disabled={isSubmitting}>{isSubmitting ? 'Registering...' : 'Register'}
                                    </button>
                                </>}
                            </form>
                        </div>
                    )}
                    {status === 'preElection' && (
                        <div className={styles.statusMessage}>
                            <div className={styles.statusImage}>
                                <img 
                                    src="/images/logo.png" 
                                    alt="Registration pending"
                                />
                            </div>
                            <h2>Registration Closed</h2>
                            <p>The registration period has ended. 
                            You can no longer register for this election.</p>
                        </div>
                    )}
                    {status === 'ended' && (
                        <div className={styles.statusMessage}>
                            <div className={styles.statusImage}>
                                <img 
                                    src="/images/logo.png" 
                                    alt="Election ended"
                                />
                            </div>
                            <h2>Election Completed</h2>
                            <p>This election has ended on {electionData.endTime.toLocaleString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </p>
                            <p>Thank you for your interest in participating!</p>
                        </div>
                    )}
                </>
            )}

            {/* Magic link flow */}
            {token && (
                <>
                    {status === 'preElection' && (
                        <div className={styles.statusMessage}>
                            <div className={styles.statusImage}>
                                <img 
                                    src="/images/logo.png" 
                                    alt="Registration pending"
                                />
                            </div>
                            <h1 className={styles.formHeading}>{electionData.title}</h1>
                            <h2>Election Countdown</h2>
                            <p>Voting starts {electionData.startTime.toLocaleString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                month: 'short',
                                day: 'numeric'
                            })}</p>
                            <div className={styles.countdown}>
                                <CountdownTimer targetDate={electionData.startTime} />
                            </div>
                        </div>
                    )}
                    {status === 'election' && (
                        <div className={styles.formContainer}>
                            <div className={styles.statusImage}>
                                <img 
                                    src="/images/logo.png" 
                                    alt="Registration pending"
                                />
                            </div>
                            <form onSubmit={handleOtpSubmit} className={styles.form}>
                                <h1 className={styles.formHeading}>{electionData.title} Voting Portal</h1>
                                {message &&
                                    <div className={message.toLowerCase().includes('invalid') ? styles.errorMessage : styles.successMessage}>
                                        {message}
                                    </div>}
                                {otpRecord &&
                                    <div className={styles.verifiedEmail}><i className='bx bx-check-shield' />
                                        Verified: {otpRecord.email}
                                    </div>}
                                <div className={styles.inputGroup}><i className='bx bx-key' />
                                    <input value={otp} onChange={handleOtpChange} placeholder='Enter OTP' className={styles.formInput}
                                           disabled={isSubmitting} required />
                                </div>
                                <button type='submit' className={styles.formButton}
                                        disabled={isSubmitting}>{isSubmitting ? 'Verifying...' : 'Open Voting Portal'}
                                </button>
                                <p className={styles.formInstruction}>Enter the 6-character OTP sent to your email</p>
                            </form>
                        </div>
                    )}
                    {status === 'ended' && (
                        <div className={styles.statusMessage}>
                            <div className={styles.statusImage}>
                                <img 
                                    src="/images/logo.png" 
                                    alt="Election ended"
                                />
                            </div>
                            <h2>Election Completed</h2>
                            <p>This election ended on {electionData.endTime.toLocaleString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </p>
                            <p>Thank you for your participation!</p>
                            {otpRecord && (
                                <div className={styles.verifiedEmail}>
                                    <i className='bx bx-check-shield' />
                                    Verified: {otpRecord.email}
                                </div>
                            )}
                            <p className={styles.formInstruction}>
                                The voting period has concluded and the portal is no longer accessible.
                            </p>
                        </div>
                    )}
                </>
            )}

            {error &&
                <div className={styles.errorMessage}>
                    <h2>Error</h2>
                    <p>{error}</p>
                </div>
            }
        </main>
    );
};

export default VoterRegister;