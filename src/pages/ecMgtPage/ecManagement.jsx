import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './ecManagement.module.css';

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

    // Fetch existing EC members
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/ec-members`);
                if (!response.ok) throw new Error('Failed to fetch members');
                const data = await response.json();
                setMembers(data);
            } catch (error) {
                toast.error('Failed to load members');
                console.error('Fetch error:', error);
            }
        };
        fetchMembers();
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
            // Validate empty fields first
            if (!formData.name.trim() || !formData.role) {
                toast.error('Please fill all required fields');
                setLoading(false);
                return;
            }

            // Client-side role uniqueness check
            const roleAlreadyExists = members.some(member => 
                member.role === formData.role
            );
            
            if (roleAlreadyExists) {
                toast.error(`${formData.role} role is already assigned!`);
                setLoading(false);
                return;
            }

            // Server request
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
            // Preserve generated password for display (not stored)
            setMembers(prev => [{
                ...newMember,
                password: formData.password // Temporary display
            }, ...prev]);
            setFormData({ name: '', role: 'chairperson', pin: '', password: '' });
            toast.success('Member saved successfully');

        } catch (err) {
            toast.error(err.message || 'Failed to save member');
        } finally {
            setLoading(false);
        }
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

    return (
        <>
            <h1 className={styles.heading}>For I.T personnel use only</h1>
            <main className={styles.main}>
                {/* ToastContainer */}
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
                                        <td>{member.password}</td>
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
                </div>
            </main>
        </>
    );
};

export default ECManagement;