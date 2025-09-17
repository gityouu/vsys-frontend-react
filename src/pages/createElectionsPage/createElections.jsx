import React, { useState } from 'react';
import styles from './createElections.module.css';
import 'boxicons/css/boxicons.min.css';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CreateElections = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // audit logging function
    const logAuditEvent = async (auditData) => {
        try {
            // Get admin name from session storage
            const adminName = sessionStorage.getItem('ecAdminName');
            
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/audit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...auditData,
                    actorType: 'ec_member',
                    ecMemberName: adminName
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to log audit event');
            }
        } catch (error) {
            console.error('Error logging audit event:', error);
        }
    };

    // Election information state
    const [electionInfo, setElectionInfo] = useState({
        title: '',
        positions: '',
        type: '',
        maxVotes: '1',
        status: 'upcoming',
        startTime: '',
        endTime: '',
        description: '',
        useCustomDeleteDays: false,
        deleteAfterDays: 30,
    });

    // Candidate form state and list of candidates
    const [candidateForm, setCandidateForm] = useState({
        name: '',
        position: '',
        bio: '',
        photo: null,
        photoPreview: '/images/download.png',
    });

    const [suggestions, setSuggestions] = useState([]);
    const [candidates, setCandidates] = useState([]);

    // Modal state for discard confirmation
    const [modalMessage, setModalMessage] = useState(null);

    // Update election info inputs
    const handleElectionChange = (e) => {
        const { name, value } = e.target;
        setElectionInfo((prev) => ({ ...prev, [name]: value }));
    };

    //position suggestions
    const positions = [
        "SRC President",
        "General Secretary",
        "Financial Secretary",
        "Treasurer",
        "Organizing Secretary",
        "Women' Organizer",
        "Public Relations Organizer",
        "Female Commissioner",
        "Male Commissioner"
    ];

    //candidate form inputs
    const handleCandidateChange = (e) => {
        const { name, value } = e.target;
        setCandidateForm((prev) => ({ ...prev, [name]: value }));

        //position suggestions
        if (name === 'position') {
            const inputValue = value.toLowerCase();
            const filtered = positions.filter(pos =>
                pos.toLowerCase().startsWith(inputValue)
            );
            setSuggestions(inputValue.length > 0 ? filtered : []);
        }
    };

    const handleSuggestionSelect = (suggestion) => {
        setCandidateForm(prev => ({ ...prev, position: suggestion }));
        setSuggestions([]);
    };

    //tab to select suggestion
    const handleKeyDown = (e) => {
        if ((e.key === 'Tab' && suggestions.length > 0)) {
            e.preventDefault();
            handleSuggestionSelect(suggestions[0]);
        }
    };

    // Handle candidate photo upload and preview
    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setCandidateForm((prev) => ({
                    ...prev,
                    photo: file,          // Store the actual File object
                    photoPreview: ev.target.result,  // Store data URL for preview
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    //helper: error if fields are empty
    const [fieldErrors, setFieldErrors] = useState({
        title: '',
        positions: '',
        type: '',
        startTime: '',
        endTime: '',
        description: '',
        candidateName: '',
        candidatePosition: ''
    });

    // Validate required fields for election info
    const validateElectionForm = () => {
        const required = [
            { key: 'title', label: 'Election Title' },
            { key: 'positions', label: 'Number of Positions' },
            { key: 'type', label: 'Election Type' },
            { key: 'startTime', label: 'Start time' },
            { key: 'endTime', label: 'End time' },
        ];

        let isValid = true;
        const newErrors = {};

        required.forEach(({ key, label }) => {
            const value = electionInfo[key] || '';
            if (!value) {
                newErrors[key] = `${label} is required`;
                isValid = false;
            }
        });

        const positionsValue = parseInt(electionInfo.positions, 10);
        if (!electionInfo.positions) {
            newErrors.positions = 'Number of Positions is required';
            isValid = false;
        } else if (isNaN(positionsValue) || positionsValue < 1) {
            newErrors.positions = 'Must be a valid number greater than 0';
            isValid = false;
        }

        if (new Date(electionInfo.startTime) < new Date()) {
            newErrors.startTime = 'Cannot select past dates/times';
            isValid = false;
        }

        if (new Date(electionInfo.endTime) < new Date()) {
            newErrors.endTime = 'Cannot select past dates/times';
            isValid = false;
        }

        setFieldErrors(prev => ({ ...prev, ...newErrors }));
        return isValid;
    };

    // Validate candidate form required fields
    const validateCandidateForm = () => {
        const errors = {};
        let isValid = true;

        // Validate candidate name
        if (!candidateForm.name?.trim()) {
            errors.candidateName = 'Candidate Name is required';
            isValid = false;
        }

        // Validate aspiring position
        if (!candidateForm.position?.trim()) {
            errors.candidatePosition = 'Aspiring Position is required';
            isValid = false;
        }

        // Validate photo
        if (candidateForm.photoPreview === '/images/download.png') {
            errors.candidatePhoto = 'Candidate photo is required';
            isValid = false;
        }

        setFieldErrors(prev => ({ ...prev, ...errors }));
        return isValid;
    };

    // function to handle the auto-delete toggle toggle
    const handleCustomDeleteToggle = () => {
        setElectionInfo(prev => ({
            ...prev,
            useCustomDeleteDays: !prev.useCustomDeleteDays
        }));
    };

    // function to handle the auto-delete days input change
    const handleDeleteDaysChange = (e) => {
        const value = Math.max(30, parseInt(e.target.value) || 30);
        setElectionInfo(prev => ({
            ...prev,
            deleteAfterDays: value
        }));
    };

    // Submit election info: move to candidate addition if valid
    const handleElectionSubmit = (e) => {
        e.preventDefault();
        if (validateElectionForm()) {
            setStep(1);
        }
    };

    // Submit candidate form: add candidate to list and reset candidate form
    const handleCandidateSubmit = (e) => {
        e.preventDefault();

        if (validateCandidateForm()) {
            const newCandidate = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2), // Generate unique ID
                name: candidateForm.name.trim(),
                position: candidateForm.position.trim(),
                slogan: candidateForm.slogan.trim(),
                photoPreview: candidateForm.photoPreview,
                photoFile: candidateForm.photo,
            };
            setCandidates((prev) => [...prev, newCandidate]);
            setCandidateForm({
                name: '',
                position: '',
                slogan: '',
                photo: null,
                photoPreview: '/images/download.png',
            });
            setFieldErrors(prev => ({
                ...prev,
                candidateName: '',
                candidatePosition: '',
                candidatePhoto: ''
            }));
        }
    };

    // Confirm candidate addition
    const handleConfirmCandidates = (e) => {
        e.preventDefault();

        // Check if there are any candidates
        if (candidates.length === 0) {
            toast.error('Please add at least one candidate before confirming');
            return;
        }

        // Get the number of positions from election info
        const numPositions = parseInt(electionInfo.positions, 10);

        // Validate number of positions
        if (isNaN(numPositions)) {
            toast.error('Invalid number of positions specified');
            return;
        }

        // Get all candidate positions (trimmed and case-sensitive)
        const positions = candidates.map(c => c.position.trim().toLowerCase());
        const uniquePositions = new Set(positions);

        // Validate position count
        if (uniquePositions.size > numPositions) {
            toast.error(
                `Too many unique positions (${uniquePositions.size}). Maximum allowed: ${numPositions}`
            );
            return;
        }

        if (uniquePositions.size < numPositions) {
            toast.warn(
                `Warning: Only ${uniquePositions.size} unique positions filled (${numPositions} specified).
        \nYou can add more positions later.`
            );
        }

        // All validations passed - proceed to summary
        setStep(2);
    };

    //sorting logic for candidates in summary section
    const groupedCandidates = candidates.reduce((acc, candidate) => {
        const position = candidate.position.trim();
        if (!acc[position]) {
            acc[position] = [];
        }
        acc[position].push(candidate);
        return acc;
    }, {});

    const sortedPositions = Object.keys(groupedCandidates).sort((a, b) => {
        // First sort alphabetically
        const alphabeticalCompare = a.localeCompare(b);
        if (alphabeticalCompare !== 0) return alphabeticalCompare;

        // If positions are equal, sort by number of candidates (descending)
        return groupedCandidates[b].length - groupedCandidates[a].length;
    });

    // sort each group's candidates alphabetically by name
    sortedPositions.forEach(position => {
        groupedCandidates[position].sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    });

    // Handle discard action: show confirmation modal
    const handleDiscard = () => {
        setModalMessage('Are you sure you want to discard this election?');
    };

    // Confirm discard action
    const confirmDiscard = (confirm) => {
        setModalMessage(null);
        if (confirm) {
            setElectionInfo({
                title: '',
                positions: '',
                type: '',
                maxVotes: '1',
                status: 'upcoming',
                startTime: '',
                endTime: '',
                description: '',
            });
            setCandidateForm({
                name: '',
                position: '',
                bio: '',
                photo: null,
                photoPreview: '/images/download.png',
            });
            setCandidates([]);
            toast.info('Election discarded');
        }
    };

    const [generatedLink, setGeneratedLink] = useState('');

    const [showLinkModal, setShowLinkModal] = useState(false);

    const generateElectionLink = (electionId) => {
        const baseUrl = window.location.origin || process.env.REACT_APP_FRONTEND_URL;
        return `${baseUrl}/voterRegister?electionId=${electionId}`;
    };

    const handlePublishElection = async (e) => {
        try {
            e.preventDefault();
            setIsSubmitting(true);

            // Upload all candidate photos first to avoid large payloads
            const candidatesWithUrls = await Promise.all(
                candidates.map(async (candidate) => {
                    if (candidate.photoFile) {
                        const formData = new FormData();
                        formData.append('photo', candidate.photoFile);

                        const uploadResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/upload`, {
                            method: 'POST',
                            body: formData,
                        });

                        const { url } = await uploadResponse.json();
                        return { 
                            ...candidate, 
                            photo: url 
                        };
                    }
                    return candidate;
                })
            );

            const electionData = {
                title: electionInfo.title,
                positions: parseInt(electionInfo.positions, 10),
                type: electionInfo.type,
                max_votes: parseInt(electionInfo.maxVotes, 10),
                status: electionInfo.status,
                start_time: electionInfo.startTime,
                end_time: electionInfo.endTime,
                delete_after_days: electionInfo.useCustomDeleteDays ? electionInfo.deleteAfterDays : 30,
                description: electionInfo.description,
                candidates: candidatesWithUrls.map(candidate => ({
                    name: candidate.name.trim(),
                    position: candidate.position.trim(),
                    slogan: candidate.slogan,
                    photo: candidate.photo
                }))
            };

            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/elections`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(electionData)
            });

            if (!response.ok) {
                await response.json();
                throw new Error('Failed to publish election');
            }

            const result = await response.json();
            const registrationLink = generateElectionLink(result.id);

            // Log audit event for election creation
            await logAuditEvent({
                action: 'election_created',
                electionId: result.id,
                electionTitle: electionInfo.title,
                additionalInfo: {
                    positions: parseInt(electionInfo.positions, 10),
                    type: electionInfo.type,
                    max_votes: parseInt(electionInfo.maxVotes, 10),
                    candidateCount: candidates.length,
                    delete_after_days: electionInfo.useCustomDeleteDays ? electionInfo.deleteAfterDays : 30
                }
            });

            setGeneratedLink(registrationLink);
            setShowLinkModal(true);
            toast.success('Election published successfully!');

        } catch (error) {
            console.error('Full error:', error);
            if (error.response) {
                const errorData = await error.response.json();
                console.error('Error details:', errorData);
            }
            toast.error(`Publish failed`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Determine progress percentage for steps (33%, 66%, 100%)
    const progressPercentage = step === 0 ? 33 : step === 1 ? 66 : 100;

    return (
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
            {/* Steps / Progress */}
            <section className={styles.stepsContainer}>
                <div className={styles.progressContainer}>
                    <div className={styles.steps} style={{ '--progress': `${progressPercentage}%` }}>
                        <div className={`${styles.step} ${step >= 0 ? styles.active : ''} ${step > 0 ? styles.completed : ''}`}>
                            <i className={`bx ${step > 0 ? 'bx-check' : 'bx-book-add'}`}></i>
                            <span>Elections Information</span>
                        </div>
                        <div className={`${styles.step} ${step >= 1 ? styles.active : ''} ${step > 1 ? styles.completed : ''}`}>
                            <i className={`bx ${step > 1 ? 'bx-check' : 'bx-user-plus'}`}></i>
                            <span>Candidates Information</span>
                        </div>
                        <div className={`${styles.step} ${step === 2 ? styles.active : ''}`}>
                            <i className="bx bx-check-shield"></i>
                            <span>Confirm Elections</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Step 0: Election Information */}
            {step === 0 && (
                <section className={styles.container}>
                    <h1 className={styles.text}>Create Elections</h1>
                    <form onSubmit={handleElectionSubmit}>
                        <div className={styles.textbox}>
                            <label>Election Title</label>
                            <input
                                type="text"
                                placeholder="eg; SRC Elections '25"
                                name="title"
                                value={electionInfo.title}
                                onChange={(e) => {
                                    handleElectionChange(e);
                                    setFieldErrors(prev => ({ ...prev, title: '' }));
                                }}
                            />
                            {fieldErrors.title && (
                                <span className={styles.fieldError}>{fieldErrors.title}</span>
                            )}
                        </div>
                        <div className={styles.textbox2}>
                            <label>Number of Positions Open for Elections</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="eg; 3"
                                name="positions"
                                value={electionInfo.positions || ''}
                                onChange={(e) => {
                                    const rawValue = e.target.value;
                                    const value = rawValue === '' ? '' : Math.max(1, parseInt(rawValue) || 1);
                                    setElectionInfo(prev => ({
                                        ...prev,
                                        positions: value !== '' ? value.toString() : ''
                                    }));
                                    setFieldErrors(prev => ({ ...prev, positions: '' }));
                                }}
                            />
                            {fieldErrors.positions && (
                                <span className={styles.fieldError}>{fieldErrors.positions}</span>
                            )}
                        </div>
                        <div className={styles.textbox3}>
                            <label>Election Type</label>
                            <input
                                type="text"
                                placeholder="eg; SRC, Departmental"
                                name="type"
                                value={electionInfo.type}
                                onChange={(e) => {
                                    handleElectionChange(e);
                                    setFieldErrors(prev => ({ ...prev, type: '' }));
                                }}
                            />
                            {fieldErrors.type && (
                                <span className={styles.fieldError}>{fieldErrors.type}</span>
                            )}
                        </div>
                        <div className={styles.dropdown}>
                            <label>Maximum Votes per Voter</label>
                            <select name="maxVotes" value={electionInfo.maxVotes} onChange={handleElectionChange}>
                                <option value="1">1</option>
                            </select>
                        </div>
                        <div className={styles.dropdown}>
                            <label>Election Status</label>
                            <select name="status" value={electionInfo.status} onChange={handleElectionChange}>
                                <option value="upcoming">Upcoming</option>
                            </select>
                        </div>
                        <div className={styles.textbox4}>
                            <label>Start time</label>
                            <input
                                type="datetime-local"
                                name="startTime"
                                value={electionInfo.startTime}
                                onChange={(e) => {
                                    handleElectionChange(e);
                                    setFieldErrors(prev => ({ ...prev, startTime: '' }));
                                }}
                            />
                            {fieldErrors.startTime && (
                                <span className={styles.fieldError}>{fieldErrors.startTime}</span>
                            )}
                        </div>
                        <div className={styles.textbox4}>
                            <label>End time</label>
                            <input
                                type="datetime-local"
                                name="endTime"
                                value={electionInfo.endTime}
                                onChange={(e) => {
                                    handleElectionChange(e);
                                    setFieldErrors(prev => ({ ...prev, endTime: '' }));
                                }}
                            />
                            {fieldErrors.endTime && (
                                <span className={styles.fieldError}>{fieldErrors.endTime}</span>
                            )}
                        </div>
                        <div className={styles.textbox5}>
                            <div className={styles.switchLayout}>
                                <label>Extend deletion period beyond 30 days</label>
                                <div 
                                    className={`${styles.toggleSwitch} ${electionInfo.useCustomDeleteDays ? styles.active : ''}`}
                                    onClick={handleCustomDeleteToggle}
                                    title='toggle'
                                >
                                    <div className={styles.toggleKnob}></div>
                                </div>
                            </div>
                            <div className={styles.deleteDaysInput}>
                                <label>Delete after (days)</label>
                                <input
                                    type="number"
                                    min="30"
                                    value={electionInfo.deleteAfterDays}
                                    onChange={handleDeleteDaysChange}
                                    disabled={!electionInfo.useCustomDeleteDays}
                                />
                            </div>
                        </div>
                        <div className={styles.textarea}>
                            <label>Description</label>
                            <textarea
                                placeholder="Write something to describe the elections..."
                                name="description"
                                value={electionInfo.description}
                                onChange={
                                    handleElectionChange
                                }
                            ></textarea>
                        </div>
                        <button type="submit" className={styles.allBtn}>
                            <i className="bx bx-plus"></i> Add Candidates
                        </button>
                    </form>
                </section>
            )}

            {/* Step 1: Candidate Addition */}
            {step === 1 && (
                <section className={styles.container} id="candidate-addition">
                    <button
                        className={styles.backButton}
                        onClick={() => setStep(0)}
                        title='Go back'
                    >
                        <i className='bx bx-arrow-back'></i>
                    </button>
                    <h1 className={styles.text}>Candidate Particulars</h1>
                    <form onSubmit={handleCandidateSubmit} className="form">
                        <div className={styles.textbox}>
                            <label>Candidate Name</label>
                            <input
                                type="text"
                                placeholder="eg; Ashley Boateng"
                                name="name"
                                value={candidateForm.name}
                                onChange={(e) => {
                                    handleCandidateChange(e);
                                    setFieldErrors(prev => ({ ...prev, candidateName: '' }));
                                }}
                            />
                            {fieldErrors.candidateName && (
                                <span className={styles.fieldError}>{fieldErrors.candidateName}</span>
                            )}
                        </div>
                        <div className={styles.textbox2}>
                            <label>Aspiring Position</label>
                            <input
                                type="text"
                                placeholder="eg; President"
                                name="position"
                                value={candidateForm.position}
                                onChange={(e) => {
                                    handleCandidateChange(e);
                                    setFieldErrors(prev => ({ ...prev, candidatePosition: '' }));
                                }}
                                onKeyDown={handleKeyDown}
                                onBlur={() => setSuggestions([])}
                            />
                            {suggestions.length > 0 && (
                                <div className={styles.suggestionsContainer}>
                                    <ul className={styles.suggestionsList}>
                                        {suggestions.map((suggestion, index) => (
                                            <li
                                                key={suggestion}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleSuggestionSelect(suggestion);
                                                }}
                                                className={styles.suggestionItem}
                                            >
                                                {suggestion.split(new RegExp(`(${candidateForm.position})`, 'i')).map((part, i) =>
                                                    part.toLowerCase() === candidateForm.position.toLowerCase() ?
                                                        <strong key={i}>{part}</strong> : part
                                                )}
                                                {index === 0 && (
                                                    <span className={styles.tabHint}>(Press Tab to select)</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {fieldErrors.candidatePosition && (
                                <span className={styles.fieldError}>{fieldErrors.candidatePosition}</span>
                            )}
                        </div>
                        <div className={styles.textbox3}>
                            <label>Candidate Slogan</label>
                            <input
                                type="text"
                                placeholder="Slogan eg;(EDD, Breaking the 8 etc)"
                                name="slogan"
                                value={candidateForm.slogan}
                                onChange={handleCandidateChange}
                            />
                        </div>
                        <div>
                            <label>Candidate Photo</label>
                            <div className={styles.photoContainer}>
                                <div
                                    className={styles.photo}
                                    onClick={() => document.getElementById('candidate-photo-input').click()}
                                >
                                    <img
                                        src={candidateForm.photoPreview}
                                        alt="candidate"
                                        className={fieldErrors.candidatePhoto ? styles.invalid : ''}
                                    />
                                    <p className={styles.addPhoto}>Add photo</p>
                                    <input
                                        type="file"
                                        id="candidate-photo-input"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handlePhotoUpload}
                                    />
                                </div>
                                {fieldErrors.candidatePhoto && (
                                    <span className={styles.fieldError}>{fieldErrors.candidatePhoto}</span>
                                )}
                            </div>
                        </div>
                        <button type="submit" className={styles.allBtn}>
                            <i className="bx bx-plus"></i> Add Candidate
                        </button>

                        <div className={styles.addedCandidatesTable}>
                            <h1 className={styles.text}>Candidate List</h1>
                            <table>
                                <thead>
                                <tr>
                                    <th>Photo</th>
                                    <th>Name</th>
                                    <th>Aspiring Position</th>
                                    <th>Preview</th>
                                </tr>
                                </thead>
                                <tbody>
                                {candidates.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className={styles.candidateTableInstruction}>
                                            <i className="bx bx-info-circle"></i>
                                            Add candidates to populate table
                                        </td>
                                    </tr>
                                ) : (
                                    candidates.map((cand, index) => (
                                        <tr key={index}>
                                            <td>
                                                <div className={styles.candidatePhoto}>
                                                    <div className={styles.photoPlaceholder}>
                                                        <img src={cand.photoPreview}
                                                             alt="candidate"
                                                             onError={(e) => {
                                                                 e.target.src = '/images/download.png';
                                                             }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{cand.name}</td>
                                            <td>{cand.position}</td>
                                            <td>
                                                <span className={styles.tooltipContainer} aria-label="Approve Voter">
                                                    <i className="bx bx-pencil" onClick={(e) => {
                                                        e.preventDefault();
                                                        setCandidateForm({
                                                            name: cand.name,
                                                            position: cand.position,
                                                            bio: cand.bio,
                                                            photo: cand.photoFile,  // Use the stored file reference
                                                            photoPreview: cand.photoPreview || '/images/download.png',
                                                        });
                                                        setCandidates((prev) => prev.filter((_, i) => i !== index));
                                                    }}></i>
                                                    <span className={styles.tooltipText}>Click to edit</span>
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                        <button onClick={handleConfirmCandidates} className={styles.allBtn}>
                            <i className="bx bx-check"></i> Confirm Candidates
                        </button>
                    </form>
                </section>
            )}

            {/* Step 2: Elections Summary */}
            {step === 2 && (
                <section className={styles.container} id="elections-summary">
                    <button
                        className={styles.backButton}
                        onClick={() => setStep(1)}
                        title='Go back'
                    >
                        <i className='bx bx-arrow-back'></i>
                    </button>
                    <h1 className={styles.text}>Election Summary</h1>
                    <div className={styles.summaryGrid}>
                        {/* Election Details */}
                        <div className={styles.summarySection}>
                            <h2 className={styles.summaryHeading}>
                                <i className="bx bx-detail"></i>
                                Election Details
                            </h2>
                            <div className={styles.summaryContent}>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Title:</span>
                                    <span className={styles.summaryValue}>{electionInfo.title}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Type:</span>
                                    <span className={styles.summaryValue}>{electionInfo.type}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Positions:</span>
                                    <span className={styles.summaryValue}>{electionInfo.positions}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Start Time:</span>
                                    <span className={styles.summaryValue}>
                                        {new Date(electionInfo.startTime).toLocaleString()}
                                    </span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>End Time:</span>
                                    <span className={styles.summaryValue}>
                                        {new Date(electionInfo.endTime).toLocaleString()}
                                    </span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Max Votes:</span>
                                    <span className={styles.summaryValue}>{electionInfo.maxVotes}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Status:</span>
                                    <span className={styles.summaryValue}>{electionInfo.status}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Description:</span>
                                    <span className={styles.summaryValue}>{electionInfo.description}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Auto-Delete After:</span>
                                    <span className={styles.summaryValue}>{electionInfo.deleteAfterDays} days</span>
                                </div>
                            </div>
                        </div>

                        {/* Candidates Summary */}
                        <div className={styles.summarySection}>
                            <h2 className={styles.summaryHeading}>
                                <i className="bx bx-group"></i>
                                Candidates Summary
                            </h2>
                            <div className={styles.summaryContent}>
                                <div className={styles.addedCandidatesTable}>
                                    <table>
                                        <thead>
                                        <tr>
                                            <th>Photo</th>
                                            <th>Name</th>
                                            <th>Position</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {sortedPositions.map(position => (
                                            <React.Fragment key={position}>
                                                <tr className={styles.positionHeader}>
                                                    <td colSpan="3">
                                                        {position} ({groupedCandidates[position].length} Candidates)
                                                    </td>
                                                </tr>
                                                {groupedCandidates[position].map((cand, index) => (
                                                    <tr key={`${position}-${index}`}>
                                                        <td>
                                                            <div className={styles.candidatePhoto}>
                                                                <div className={styles.photoPlaceholder}>
                                                                    <img src={cand.photoPreview} alt="candidate" />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{cand.name}</td>
                                                        <td>{cand.position}</td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.confirmationButtons}>
                        <button className={styles.discardBtn} onClick={handleDiscard}>
                            <i className="bx bx-trash"></i> Discard Elections
                        </button>
                        <button
                            className={styles.confirmBtn}
                            onClick={handlePublishElection}
                            disabled={isSubmitting}
                        >
                            <i className="bx bx-check-shield"></i>{isSubmitting ? 'Publishing...' : 'Publish Elections'}
                        </button>
                    </div>
                </section>
            )}

            {showLinkModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.linkModalContent}>
                        <h3>Voter Registration Link</h3>
                        <p>Share this link with voters for registration:</p>

                        <div className={styles.linkContainer}>
                            <div className={styles.linkGroup}>
                                <input
                                    type="text"
                                    value={generatedLink}
                                    readOnly
                                    className={styles.linkInput}
                                />
                                <button
                                    className={styles.copyButton}
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedLink);
                                        toast.success('Link copied to clipboard!');
                                    }}
                                >
                                    <i className="bx bx-copy"></i> Copy
                                </button>
                            </div>
                        </div>

                        <div className={styles.modalButtons}>
                            <button
                                className={styles.confirmBtn}
                                onClick={() => {setShowLinkModal(false);
                                    navigate('/adminDashboard');
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for discard confirmation */}
            {modalMessage && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <p>{modalMessage}</p>
                        <div className={styles.modalButtons}>
                            <button className={styles.confirmBtn} onClick={() => {
                                confirmDiscard(true);
                                navigate('/adminDashboard');
                            }}>
                                Yes
                            </button>
                            <button className={styles.discardBtn} onClick={() => confirmDiscard(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default CreateElections;
