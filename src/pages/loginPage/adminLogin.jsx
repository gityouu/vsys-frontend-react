import React, { useState } from 'react';
import styles from './adminLogin.module.css';
import 'boxicons/css/boxicons.min.css';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [adminPin, setAdminPin] = useState("");
    const [adminPswd, setAdminPswd] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        if (!adminPin || !adminPswd) {
            setErrorMessage("Please fill in all fields");
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pin: parseInt(adminPin),
                    password: adminPswd
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            sessionStorage.setItem('ecAdminName', data.user.name);
            sessionStorage.setItem('ecAdminRole', data.user.role);

            // On successful login
            navigate("/adminDashboard", {
                state: {
                    adminName: data.user.name,
                    adminRole: data.user.role
                }
            });
        } catch (error) {
            setErrorMessage(error.message || "Authentication failed. Please try again.");
            console.error('Login error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className={styles.main}>
            <div className={styles.loginContainer}>
                <h1 className={styles.formHeader}>Access Election Portal</h1>
                <p className={styles.formInstruction}>Log In to continue</p>

                <div className={styles.formContainer}>
                    <form className={styles.formContainerFields} onSubmit={handleLogin}>
                        <div className={styles.inputGroup}>
                            <i className="bx bxs-key"></i>
                            <input
                                placeholder="Admin Pin"
                                type="text"
                                value={adminPin}
                                onChange={(e) => setAdminPin(e.target.value.replace(/\D/, ''))}
                                maxLength="4"
                                inputMode="numeric"
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <i className="bx bxs-lock-alt"></i>
                            <input
                                placeholder="Admin Password"
                                type={showPassword ? "text" : "password"}
                                value={adminPswd}
                                onChange={(e) => setAdminPswd(e.target.value)}
                                maxLength="6"
                            />
                            <i
                                className={showPassword ? "bx bx-hide" : "bx bx-show"}
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? "Hide password" : "Show password"}
                                role="button"
                                tabIndex="0"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        setShowPassword(!showPassword);
                                    }
                                }}
                            ></i>
                        </div>

                        {errorMessage && (
                            <div className={styles.errorMessage}>
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            className={styles.formLogInBtn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Loading...' : 'Log In'}
                        </button>
                    </form>
                </div>

                <a
                    href={`mailto:?subject=${encodeURIComponent('Election Portal Support Request')}&body=${encodeURIComponent('Please describe your issue in detail:\n\n• \n• \n• ')}`}
                >
                    Contact Support Team
                </a>
            </div>
        </main>
    );
};

export default AdminLogin;