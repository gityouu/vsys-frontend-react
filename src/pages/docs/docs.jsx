import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'boxicons/css/boxicons.min.css';
import styles from '../dashboardPage/adminDashboard.module.css';
import style from './docs.module.css';

const Docs = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('elections');

    const handleNavClick = (target) => {
        setActiveSection(target);
    };

    return(
        <main className={styles.main}>
            {/* Navbar Section */}
            <section className={styles.navbarContainer}>
                <nav className={styles.navbar}>
                    <h1 className={styles.navbarHeading}>E.C ADMIN DOCS</h1>
                </nav>
            </section>

            {/* Sidepanel Section */}
            <section className={styles.sidepanelContainer}>
                <div className={styles.logo}>
                    <img src='/images/logo.png' alt="logo" />
                </div>
                <div className={styles.sidepanelNavigations}>
                    <ul className={styles.sidepanelNavigationsList}>
                        <li data-target="elections"
                            className={activeSection === 'elections' ? styles.active : ''}
                            onClick={() => handleNavClick('elections')}>Managing Elections</li>

                        <li className={activeSection === 'createElections' ? styles.active : ''}
                            onClick={() => handleNavClick('createElections')}>Creating Elections</li>

                        <li className={activeSection === 'voterRegister' ? styles.active : ''}
                            onClick={() => handleNavClick('voterRegister')}>Voter Registering</li>

                        <li className={activeSection === 'voterVotes' ? styles.active : ''}
                            onClick={() => handleNavClick('voterVotes')}>Voter Voting</li>
                    </ul>
                </div>
                <div className={styles.sidepanelSettings}>
                    <ul className={styles.sidepanelSettingsList}>
                        <li role='button'
                            onClick={() => navigate('/adminDashboard')}>
                            <i className='bx bx-log-out-circle'></i>Back
                        </li>
                    </ul>
                </div>
            </section>

            <div className={style.container}>
                {activeSection === 'elections' && (
                    <section>
                        <h1 className={style.headings}>Documentation for Admin Dashboard</h1>

                        <div className={style.section}>
                            <h2>Overview</h2>
                            <p>The Admin Dashboard is a centralized interface for managing elections,
                                voters, candidates, and analyzing election results. This document guides
                                administrators through its features, navigation, and functionalities based
                                on the implemented logic.</p>
                        </div>

                        <div className={style.section}>
                            <h2>Getting Started</h2>
                            <ul>
                                <li><strong>Access</strong>: Log in with your admin credentials via
                                    the designated platform (e.g., browser or app).</li>
                                <li><strong>Initial Load</strong>: Upon login, the dashboard displays
                                    a toast notification with your name and role, and data
                                    (elections, voters, etc.) loads with a minimum 5-second delay to
                                    ensure stability.</li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Navigation</h2>
                            <ul>
                                <li><strong>Sidebar</strong>: Located on the left, featuring:
                                    <ul>
                                        <li><strong>Logo</strong>: Displays the election commission logo.</li>
                                        <li><strong>Navigation Menu</strong>: Options include:
                                            <ul>
                                                <li><em>Election Management</em>: View and manage elections.</li>
                                                <li><em>Voter Management</em>: Handle voter registrations.</li>
                                                <li><em>Candidate Management</em>: Review candidate details.</li>
                                                <li><em>Results & Analytics</em>: Analyze election data and
                                                    export results.</li>
                                            </ul>
                                        </li>
                                        <li><strong>EC Members</strong>: Shows up to 3 members with initials
                                            (e.g., "EC" if no data) and tooltips with names and roles.</li>
                                        <li><strong>Settings</strong>: Includes "Support" and "LogOut" options.</li>
                                    </ul>
                                </li>
                                <li><strong>Navbar</strong>: At the top, with:
                                    <ul>
                                        <li><strong>Title</strong>: "E.C ADMIN PANEL".</li>
                                        <li><strong>Search Bar</strong>: Filter content by typing
                                            (case-insensitive).</li>
                                        <li><strong>Notification Bell</strong>: Alerts for new voter requests
                                            (count displayed if {'>'} 0), with a tooltip showing the number
                                            of unseen requests.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Sections</h2>

                            <h3>Election Management</h3>
                            <ul>
                                <li><strong>Overview Cards</strong>: Display counts of upcoming, active,
                                    and recently completed elections (within 30 days).</li>
                                <li><strong>Elections List</strong>:
                                    <ul>
                                        <li><strong>Columns</strong>: Title, Start Date, End Date, TurnOut
                                            (e.g., "1/1 (100.0%)"), Status (upcoming/active/completed), Action.</li>
                                        <li><strong>TurnOut</strong>: Calculated as <span className="highlight">
                                            (unique voters / approved registrations) * 100</span>,
                                            showing "No approved voters" if no registrations.</li>
                                        <li><strong>Actions</strong>: Click the eye icon to view a single
                                            election (toggle back to all with the hide icon).</li>
                                        <li><strong>Search</strong>: Filters by election title.</li>
                                        <li><strong>Empty State</strong>: Shown if no elections match the
                                            search or none exist.</li>
                                        <li><strong>New Elections</strong>: Button to create new elections,
                                            redirecting to a creation page.</li>
                                    </ul>
                                </li>
                                <li><strong>Loading</strong>: A download icon spins during data fetch
                                    (minimum 5 seconds).</li>
                            </ul>

                            <h3>Voter Management</h3>
                            <ul>
                                <li><strong>Overview Cards</strong>: Show new requests, total approved, and
                                    rejected registrants.</li>
                                <li><strong>Pending Approval</strong>:
                                    <ul>
                                        <li><strong>Columns</strong>: Registered At, Email, Election Title,
                                            Actions.</li>
                                        <li><strong>Actions</strong>:
                                            <ul>
                                                <li><em>Approve</em>: Sends an OTP (e.g., "HD25-123456") via
                                                    email with a magic link; shows a spinner during processing.</li>
                                                <li><em>Decline</em>: Marks as declined instantly.</li>
                                            </ul>
                                        </li>
                                        <li><strong>New Requests</strong>: Marked with a pulsing red dot until
                                            interacted with.</li>
                                        <li><strong>Search</strong>: Filters by email or election title.</li>
                                        <li><strong>Irreversible Actions</strong>: Warning displayed.</li>
                                    </ul>
                                </li>
                                <li><strong>Approved</strong>:
                                    <ul>
                                        <li><strong>Columns</strong>: Approved At, Email, Election Title,
                                            Has Voted (Yes/No for active or completed elections).</li>
                                        <li><strong>Has Voted</strong>: Based on unique voter email per
                                            election.</li>
                                    </ul>
                                </li>
                                <li><strong>Declined</strong>: Lists declined registrations with Declined
                                    At, Email, and Election Title.</li>
                                <li><strong>Empty States</strong>: Displayed if no data matches filters.</li>
                            </ul>

                            <h3>Candidate Management</h3>
                            <ul>
                                <li><strong>Overview Cards</strong>: Show total candidates, unique positions,
                                    and presidential candidates.</li>
                                <li><strong>Candidates List</strong>:
                                    <ul>
                                        <li>Grouped by election and position (President first).</li>
                                        <li><strong>Columns</strong>: Photo, Name, Position.</li>
                                        <li><strong>Search</strong>: Filters by name or position across all
                                            elections.</li>
                                        <li><strong>Empty States</strong>: Shown if no candidates match or
                                            exist per election.</li>
                                    </ul>
                                </li>
                            </ul>

                            <h3>Results & Analytics</h3>
                            <ul>
                                <li><strong>Overview</strong>: Displays for a selected or active election.</li>
                                <li><strong>Cards</strong>:
                                    <ul>
                                        <li><em>Total Votes Cast</em>: Number of unique voters.</li>
                                        <li><em>Voter Turnout</em>: Percentage based on approved
                                            registrations.</li>
                                        <li><em>Leading Candidate</em>: Name of the top presidential
                                            candidate by votes (or "No votes yet").</li>
                                    </ul>
                                </li>
                                <li><strong>Charts</strong> (for presidential votes if data exists):
                                    <ul>
                                        <li><em>Bar Chart</em>: Votes per candidate.</li>
                                        <li><em>Pie Chart</em>: Vote distribution.</li>
                                        <li><em>Line Chart</em>: Cumulative votes over time.</li>
                                    </ul>
                                </li>
                                <li><strong>Other Positions</strong>: Tables per position with Candidate,
                                    Votes, and Percentage (for completed elections).</li>
                                <li><strong>Export Results</strong>: Generates a PDF with:
                                    <ul>
                                        <li>Title and dates.</li>
                                        <li>Tables per position (sorted, with percentages for completed
                                            elections).</li>
                                        <li>Summary (votes, registered voters, turnout) for completed
                                            elections.</li>
                                        <li>"PROVISIONAL" watermark for active elections.</li>
                                    </ul>
                                </li>
                                <li><strong>Empty State</strong>: Shown if no election data is available.</li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Key Features</h2>
                            <ul>
                                <li><strong>Real-Time Updates</strong>: Voter and vote data refreshes
                                    instantly via database.</li>
                                <li><strong>Status Updates</strong>: Election status updates every minute.</li>
                                <li><strong>Tooltips</strong>: Hover over icons for action hints
                                    (e.g., "Approve", "Decline").</li>
                                <li><strong>Error Handling</strong>: Toast notifications for successes
                                    (e.g., "OTP sent") or failures (e.g., "Failed to generate report").</li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Best Practices</h2>
                            <ul>
                                <li>Verify email uniqueness before approving voters to avoid turnout
                                    discrepancies.</li>
                                <li>Export results only after confirming vote counts align with
                                    expectations.</li>
                                <li>Use the search function to quickly locate specific elections,
                                    voters, or candidates.</li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Troubleshooting</h2>
                            <ul>
                                <li><strong>TurnOut Discrepancy</strong>: If turnout exceeds 100%, contact
                                    support team.</li>
                                <li><strong>No Data</strong>: Ensure internet connectivity and refresh the
                                    page.</li>
                                <li><strong>Export Failure</strong>: Verify election selection and try again.</li>
                            </ul>
                            <p>For support, click the "Support" option in the sidebar to open a modal
                                (implementation pending detailed styling).</p>
                        </div>
                    </section>
                )}

                {activeSection === 'createElections' && (
                    <section>
                        <h1 className={style.headings}>Documentation for Creating Elections</h1>

                        <div className={style.section}>
                            <h2>Overview</h2>
                            <p>The Create Elections page allows administrators to set up new elections
                                by entering election details, adding candidates, and publishing the
                                election to database. The process is divided into three steps: Election
                                Information, Candidate Addition, and Election Summary. This document guides
                                users through each step and functionality based on the implemented logic.</p>
                        </div>

                        <div className={style.section}>
                            <h2>Getting Started</h2>
                            <ul>
                                <li><strong>Access</strong>: Navigate to the Create Elections page from the
                                    Admin Dashboard by clicking the "New Elections" button in the Election
                                    Management section.</li>
                                <li><strong>Progress Tracking</strong>: A progress bar at the top shows the
                                    current step (Election Information: 33%, Candidate Addition: 66%, Election
                                    Summary: 100%).</li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Steps to Create an Election</h2>

                            <h3>Step 1: Election Information</h3>
                            <ul>
                                <li><strong>Purpose</strong>: Enter details about the election.</li>
                                <li><strong>Fields</strong>:
                                    <ul>
                                        <li><strong>Election Title</strong>: Enter a unique title
                                            (e.g., "SRC Elections '25"). Required.</li>
                                        <li><strong>Number of Positions</strong>: Specify the number of
                                            unique positions (e.g., 3). Must be a positive integer. Required.</li>
                                        <li><strong>Election Type</strong>: Specify the type
                                            (e.g., "SRC", "Departmental"). Required.</li>
                                        <li><strong>Maximum Votes per Voter</strong>: Fixed at 1
                                            (non-editable dropdown).</li>
                                        <li><strong>Election Status</strong>: Fixed as "Upcoming"
                                            (non-editable dropdown).</li>
                                        <li><strong>Start Time</strong>: Select a future date and time for
                                            the election start. Required.</li>
                                        <li><strong>End Time</strong>: Select a future date and time for
                                            the election end. Required.</li>
                                        <li><strong>Description</strong>: Optional field to describe the
                                            election.</li>
                                    </ul>
                                </li>
                                <li><strong>Validation</strong>:
                                    <ul>
                                        <li>Required fields must not be empty.</li>
                                        <li>Number of Positions must be a valid number greater than 0.</li>
                                        <li>Start and End Times cannot be in the past.</li>
                                    </ul>
                                </li>
                                <li><strong>Action</strong>: Click "Add Candidates" to proceed to Step 2
                                    if validation passes. Errors are displayed below respective fields if
                                    validation fails.</li>
                            </ul>

                            <h3>Step 2: Candidate Addition</h3>
                            <ul>
                                <li><strong>Purpose</strong>: Add candidates for the election.</li>
                                <li><strong>Navigation</strong>: Click the back arrow to return to Step 1.</li>
                                <li><strong>Fields</strong>:
                                    <ul>
                                        <li><strong>Candidate Name</strong>: Enter the candidate's name
                                            (e.g., "Ashley Boateng"). Required.</li>
                                        <li><strong>Aspiring Position</strong>: Enter the position
                                            (e.g., "President"). Required. Features:
                                            <ul>
                                                <li><strong>Auto-Suggestions</strong>: Suggests positions
                                                    like "SRC President", "General Secretary", etc., as you
                                                    type.</li>
                                                <li><strong>Tab Selection</strong>: Press Tab to select
                                                    the first suggestion (hint displayed).</li>
                                            </ul>
                                        </li>
                                        <li><strong>Candidate Slogan</strong>: Optional field for a slogan
                                            (e.g., "Breaking the 8").</li>
                                        <li><strong>Candidate Photo</strong>: Upload a photo
                                            (click the placeholder to select a file). Required.</li>
                                    </ul>
                                </li>
                                <li><strong>Validation</strong>:
                                    <ul>
                                        <li>Name, Position, and Photo are required.</li>
                                        <li>Errors are displayed below fields if validation fails.</li>
                                    </ul>
                                </li>
                                <li><strong>Actions</strong>:
                                    <ul>
                                        <li><strong>Add Candidate</strong>: Adds the candidate to the list
                                            below and resets the form.</li>
                                        <li><strong>Edit Candidate</strong>: Click the pencil icon in the
                                            candidate list to edit a candidate (loads details back into the
                                            form and removes them from the list).</li>
                                        <li><strong>Confirm Candidates</strong>: Validates the number of
                                            unique positions against the specified number in Step 1:
                                            <ul>
                                                <li>Errors if unique positions exceed the specified number.</li>
                                                <li>Warns if fewer positions are filled but allows
                                                    proceeding.</li>
                                                <li>Requires at least one candidate to proceed to Step 3.</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </li>
                                <li><strong>Candidate List</strong>:
                                    <ul>
                                        <li>Displays added candidates with columns: Photo, Name,
                                            Aspiring Position, Preview (edit option).</li>
                                        <li>Shows an instructional message if no candidates are added.</li>
                                    </ul>
                                </li>
                            </ul>

                            <h3>Step 3: Election Summary</h3>
                            <ul>
                                <li><strong>Purpose</strong>: Review election details and candidates before
                                    publishing.</li>
                                <li><strong>Navigation</strong>: Click the back arrow to return to Step 2.</li>
                                <li><strong>Sections</strong>:
                                    <ul>
                                        <li><strong>Election Details</strong>: Displays Title, Type,
                                            Positions, Start Time, End Time, Max Votes, Status, and Description.</li>
                                        <li><strong>Candidates Summary</strong>:
                                            <ul>
                                                <li>Grouped by position, sorted alphabetically by position
                                                    name, then by the number of candidates (descending).</li>
                                                <li>Within each position, candidates are sorted
                                                    alphabetically by name.</li>
                                                <li>Columns: Photo, Name, Position.</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </li>
                                <li><strong>Actions</strong>:
                                    <ul>
                                        <li><strong>Discard Elections</strong>: Opens a confirmation
                                            modal. Confirming discards all data and redirects to the
                                            Admin Dashboard.</li>
                                        <li><strong>Publish Elections</strong>: Submits the election to
                                            database, generates a voter registration link, and displays it
                                            in a modal. The button shows "Publishing..." during submission.</li>
                                    </ul>
                                </li>
                                <li><strong>Voter Registration Link Modal</strong>:
                                    <ul>
                                        <li>Displays the generated link
                                            (e.g., "http://yourdomain.com/voterRegister?electionId=abc123").</li>
                                        <li><strong>Copy</strong>: Copies the link to the clipboard with
                                            a success toast.</li>
                                        <li><strong>Close</strong>: Closes the modal and redirects to the
                                            Admin Dashboard.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Key Features</h2>
                            <ul>
                                <li><strong>Progress Indicator</strong>: Visual progress bar with icons
                                    (book, user-plus, check-shield) to track steps.</li>
                                <li><strong>Validation</strong>: Real-time validation with error messages
                                    for required fields and logical checks (e.g., past dates, position counts).</li>
                                <li><strong>Auto-Suggestions</strong>: Position field suggests common roles
                                    with Tab selection support.</li>
                                <li><strong>Photo Preview</strong>: Immediate preview of uploaded candidate
                                    photos.</li>
                                <li><strong>Toast Notifications</strong>: Feedback for actions
                                    (e.g., "Election published successfully!", "Link copied to clipboard!").</li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Best Practices</h2>
                            <ul>
                                <li>Ensure Start and End Times are set correctly to avoid scheduling
                                    conflicts.</li>
                                <li>Add candidates for all specified positions to avoid warnings during
                                    confirmation.</li>
                                <li>Double-check the summary before publishing to ensure accuracy.</li>
                                <li>Share the voter registration link securely with intended voters.</li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Troubleshooting</h2>
                            <ul>
                                <li><strong>Validation Errors</strong>: Check error messages below fields
                                    and correct the input (e.g., select future dates, upload a photo).</li>
                                <li><strong>Position Count Mismatch</strong>: Adjust the number of unique
                                    positions or candidates to match the specified number in Step 1.</li>
                                <li><strong>Publish Failure</strong>: Ensure internet connectivity and try
                                    again. Check console for error details if the issue persists.</li>
                                <li><strong>Photo Not Displaying</strong>: Ensure the file is a valid image
                                    and try re-uploading.</li>
                            </ul>
                            <p>For further assistance, contact support via the Admin Dashboard's Support
                                option.</p>
                        </div>
                    </section>
                )}

                {activeSection === 'voterRegister' && (
                    <section>
                        <h1 className={style.headings}>Documentation for Voter Registration</h1>

                        <div className={style.section}>
                            <h2>Overview</h2>
                            <p>The Voter Register page enables voters to register for an election and access
                                the voting portal using a one-time password (OTP). The page supports two
                                flows: registration (without a token) and voting access (with a token).
                                It validates eligibility, manages election timelines, and integrates with
                                database for data storage. This section of the documentation explains
                                the page's functionality and user flows based on the implemented logic.</p>
                        </div>

                        <div className={style.section}>
                            <h2>Getting Started</h2>
                            <ul>
                                <li><strong>Access</strong>: Navigate to the Voter Register page via a
                                    provided link containing an <code>electionId</code>
                                    (e.g., <code>/voterRegister?electionId=abc123</code>). For voting access,
                                    the link will also include a <code>token</code>
                                    (e.g., <code>/voterRegister?electionId=abc123&token=xyz789</code>).</li>
                                <li><strong>Prerequisites</strong>:
                                    <ul>
                                        <li>A valid election ID must be present in the URL to fetch
                                            election data.</li>
                                        <li>For voting access, a token and matching OTP are required
                                            (sent via email after registration approval).</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>User Flows</h2>

                            <h3>Flow 1: Registration (No Token)</h3>
                            <p>This flow applies when accessing the page without a token parameter in
                                the URL. The page's behavior depends on the election's
                                timeline and status.</p>
                            <ul>
                                <li><strong>Pending Registration</strong> (Before Registration Opens):
                                    <ul>
                                        <li><strong>Condition</strong>: Current time is within 15 minutes
                                            after the election's creation date.</li>
                                        <li><strong>Display</strong>: "Registration Pending" message with
                                            the registration start time (election creation date + 15 minutes).</li>
                                        <li><strong>Action</strong>: No registration form is shown; users
                                            must wait until registration opens.</li>
                                    </ul>
                                </li>
                                <li><strong>Registration Open</strong>:
                                    <ul>
                                        <li><strong>Condition</strong>: Current time is between the
                                            registration start (election creation + 15 minutes) and registration
                                            end (election start time - 15 minutes).</li>
                                        <li><strong>Form</strong>:
                                            <ul>
                                                <li><strong>Title</strong>: Displays the election title
                                                    (e.g., "SRC Elections '25 Registration").</li>
                                                <li><strong>Instruction</strong>: Shows when registration
                                                    closes (election start time - 15 minutes).</li>
                                                <li><strong>Email Field</strong>: Input for the voter's
                                                    school email (must end with "@hcuc.edu.gh"). Required.</li>
                                                <li><strong>Register Button</strong>: Submits the
                                                    registration.</li>
                                            </ul>
                                        </li>
                                        <li><strong>Validation</strong>:
                                            <ul>
                                                <li>Email must match the school domain (@hcuc.edu.gh).</li>
                                                <li>Checks if the email is already registered for this
                                                    election; if so, displays "Already registered" via
                                                    toast.</li>
                                            </ul>
                                        </li>
                                        <li><strong>Submission</strong>:
                                            <ul>
                                                <li>Adds the registration to database with status "pending".</li>
                                                <li>Shows a success message: "Registration successful!
                                                    You will receive an OTP once approved."</li>
                                                <li>Disables the form after successful registration.</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </li>
                                <li><strong>Registration Closed</strong>:
                                    <ul>
                                        <li><strong>Condition</strong>: Current time is after registration
                                            end but before the election ends.</li>
                                        <li><strong>Display</strong>: "Registration Closed" message
                                            indicating that new registrations are no longer accepted.</li>
                                    </ul>
                                </li>
                                <li><strong>Election Completed</strong>:
                                    <ul>
                                        <li><strong>Condition</strong>: Current time is after the election's
                                            end time.</li>
                                        <li><strong>Display</strong>: "Election Completed" message with a
                                            thank-you note for participation.</li>
                                    </ul>
                                </li>
                            </ul>

                            <h3>Flow 2: Voting Access (With Token)</h3>
                            <p>This flow applies when accessing the page with a token parameter, typically
                                via a magic link sent after registration approval.</p>
                            <ul>
                                <li><strong>Initial Validation</strong>:
                                    <ul>
                                        <li>Verifies the token against database
                                            (checks for a matching unused OTP record for the election).</li>
                                        <li>If invalid or expired, displays an error:
                                            "Invalid or expired link".</li>
                                    </ul>
                                </li>
                                <li><strong>Pre-Election</strong> (Before Voting Starts):
                                    <ul>
                                        <li><strong>Condition</strong>: Current time is before the
                                            election's start time.</li>
                                        <li><strong>Display</strong>:
                                            <ul>
                                                <li>Election title (e.g., "SRC Elections '25").</li>
                                                <li>"Election Countdown" with the voting start time.</li>
                                                <li>Countdown timer showing days, hours, minutes, and
                                                    seconds until the election starts.</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </li>
                                <li><strong>Election Active</strong> (Voting Period):
                                    <ul>
                                        <li><strong>Condition</strong>: Current time is between the
                                            election's start and end times.</li>
                                        <li><strong>Form</strong>:
                                            <ul>
                                                <li><strong>Title</strong>: Displays the election title
                                                    (e.g., "SRC Elections '25 Voting Portal").</li>
                                                <li><strong>Verified Email</strong>: Shows the voter's
                                                    email (e.g., "Verified: voter@hcuc.edu.gh") with a
                                                    checkmark icon.</li>
                                                <li><strong>OTP Field</strong>: Input for the OTP
                                                    (format: HD[year]-######, e.g., "HD25-123456").
                                                    Automatically prefixes with "HD[year]-" and restricts suffix
                                                    to 6 digits.</li>
                                                <li><strong>Open Voting Portal Button</strong>: Submits the
                                                    OTP for verification.</li>
                                                <li><strong>Instruction</strong>: "Enter the OTP sent to
                                                    your email".</li>
                                            </ul>
                                        </li>
                                        <li><strong>Validation</strong>:
                                            <ul>
                                                <li>Checks if the election is still active
                                                    (not started or already ended).</li>
                                                <li>Verifies the OTP against database
                                                    (must match the token, election ID, and be unused).</li>
                                                <li>Displays errors like "Invalid or used OTP",
                                                    "Voting not yet started", or "Voting closed"
                                                    if validation fails.</li>
                                            </ul>
                                        </li>
                                        <li><strong>Submission</strong>:
                                            <ul>
                                                <li>Marks the OTP as used in Firestore.</li>
                                                <li>Stores the voter's email in session storage.</li>
                                                <li>Redirects to the voting page
                                                    (<code>/voterVotes?electionId=[electionId]</code>).</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Key Features</h2>
                            <ul>
                                <li><strong>Dynamic Status Updates</strong>: Election status updates every
                                    minute based on the current time and election timeline
                                    (pending, registration, preElection, election, ended).</li>
                                <li><strong>Countdown Timer</strong>: Displays a live countdown to the
                                    election start during the pre-election phase.</li>
                                <li><strong>Email Validation</strong>: Restricts registration to school
                                    email addresses (@hcuc.edu.gh) and prevents duplicate registrations.</li>
                                <li><strong>OTP Security</strong>: Ensures secure voting access by
                                    validating OTPs and marking them as used to prevent reuse.</li>
                                <li><strong>Toast Notifications</strong>: Provides feedback for actions
                                    (e.g., "Registration successful!", "Already registered").</li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Best Practices(Share with voters)</h2>
                            <ul>
                                <li>Use your official school email to register to ensure eligibility.</li>
                                <li>Register as soon as the registration period opens to avoid missing the
                                    deadline (15 minutes before the election starts).</li>
                                <li>Check your email for the OTP and magic link after your registration is
                                    approved by an admin.</li>
                                <li>Enter the OTP exactly as provided in the email, including the prefix
                                    (e.g., "HD25-123456").</li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Troubleshooting</h2>
                            <ul>
                                <li><strong>Invalid Link Error</strong>: Ensure the URL contains a
                                    valid <code>electionId</code> and, for voting, a valid <code>token</code>.
                                    Contact the election admin if the issue persists.</li>
                                <li><strong>Already Registered</strong>: If you see this message, you’ve
                                    already registered with that email. Check your email for the OTP link.</li>
                                <li><strong>Invalid or Used OTP</strong>: Verify the OTP matches the one
                                    sent to your email. If it’s already used, contact the admin for assistance.</li>
                                <li><strong>Voting Not Started/Closed</strong>: Check the election timeline
                                    displayed on the page. Voting is only available between the start and end
                                    times.</li>
                            </ul>
                            <p>For further assistance, contact the election administrator via the support
                                channels provided by your institution.</p>
                        </div>
                    </section>
                )}

                {activeSection === 'voterVotes' && (
                    <section>
                        <h1 className={style.headings}>Documentation for Voter Voting</h1>

                        <div className={style.section}>
                            <h2>Overview</h2>
                            <p>The Voter Votes page allows registered voters to cast their votes for
                                candidates in an election and generate a voting receipt upon completion.
                                It displays available positions, candidate details, and a countdown timer.
                                This page of the documentation outlines the page's functionality based on
                                the implemented logic.</p>
                        </div>

                        <div className={style.section}>
                            <h2>Getting Started</h2>
                            <ul>
                                <li><strong>Access</strong>: Navigate to the Voter Votes page via a
                                    URL with an <code>electionId</code> (e.g., <code>/voterVotes?electionId=abc123</code>)
                                    after OTP verification on the Voter Register page. Requires a valid voter
                                    email.</li>
                                <li><strong>Prerequisites</strong>:
                                    <ul>
                                        <li>A valid <code>electionId</code> must be present in the URL.</li>
                                        <li>The voter's email must be stored in session storage from the OTP
                                            validation step.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Page Functionality</h2>

                            <h3>Initial Load and Data Fetch</h3>
                            <ul>
                                <li><strong>Process</strong>: Fetches election data (title, candidates,
                                    end time) and the voter's previous votes.</li>
                                <li><strong>Display</strong>:
                                    <ul>
                                        <li>Shows a loading spinner while data is retrieved.</li>
                                        <li>Displays an error message (e.g., "Election not found") if the
                                            fetch fails.</li>
                                    </ul>
                                </li>
                            </ul>

                            <h3>Election Timer</h3>
                            <ul>
                                <li><strong>Functionality</strong>: Displays a live countdown to the
                                    election's end time (days, hours, minutes, seconds).</li>
                                <li><strong>Behavior</strong>:
                                    <ul>
                                        <li>Updates every second until the end time is reached.</li>
                                        <li>Switches to "Election has ended" when the countdown reaches
                                            zero.</li>
                                    </ul>
                                </li>
                            </ul>

                            <h3>Voting Interface</h3>
                            <ul>
                                <li><strong>Available Positions</strong>:
                                    <ul>
                                        <li><strong>Display</strong>: Lists unique positions (e.g., "SRC
                                            President", "General Secretary") as cards.</li>
                                        <li><strong>Actions</strong>:
                                            <ul>
                                                <li>Click "View" to select a position (disabled if already
                                                    voted or election ended).</li>
                                                <li>Shows "Voted" if the voter has already cast a vote for
                                                    that position.</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </li>
                                <li><strong>Candidates for Selected Position</strong>:
                                    <ul>
                                        <li><strong>Navigation</strong>: Click the back arrow to return to
                                            the positions list.</li>
                                        <li><strong>Display</strong>: Shows candidate cards with photo, name,
                                            slogan, and a vote button.</li>
                                        <li><strong>Warning</strong>: Displays "Your vote is final - choose
                                            carefully" to emphasize vote irreversibility.</li>
                                        <li><strong>Vote Button</strong>:
                                            <ul>
                                                <li>Enabled only if no vote has been cast for the position
                                                    and the election is active.</li>
                                                <li>Shows a spinner during voting.</li>
                                                <li>Displays "Voted" after a successful vote.</li>
                                                <li>Disabled if the election has ended or the position is
                                                    already voted for.</li>
                                            </ul>
                                        </li>
                                        <li><strong>Validation</strong>:
                                            <ul>
                                                <li>Prevents voting if the session expires (no voter email).</li>
                                                <li>Prevents duplicate votes for the same position.</li>
                                                <li>Records the vote with the candidate ID, voter email,
                                                    and timestamp.</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </li>
                            </ul>

                            <h3>Completion and Receipt Generation</h3>
                            <ul>
                                <li><strong>Done Button</strong>:
                                    <ul>
                                        <li>Enabled only when all unique positions have been voted for and
                                            the election is active.</li>
                                        <li>Shows a spinner during PDF generation.</li>
                                        <li>Disabled if the election has ended or PDF generation is in
                                            progress.</li>
                                    </ul>
                                </li>
                                <li><strong>Receipt Generation</strong>:
                                    <ul>
                                        <li>Creates a PDF with the election title, voter email, election
                                            code, date, and a table of voted candidates.</li>
                                        <li>Includes a logo image and a "Thank you for voting!" message.</li>
                                        <li>Saves the PDF with the filename <code>[electionTitle]-voting-receipt.pdf</code>.</li>
                                        <li>Clears the voter email from session storage.</li>
                                    </ul>
                                </li>
                                <li><strong>Thank You Dialog</strong>:
                                    <ul>
                                        <li>Displayed after successful receipt generation with a message
                                            confirming the vote and receipt download.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Key Features</h2>
                            <ul>
                                <li><strong>Live Countdown</strong>: Real-time timer showing remaining
                                    voting time.</li>
                                <li><strong>Vote Validation</strong>: Ensures one vote per position and
                                    prevents voting after the election ends.</li>
                                <li><strong>Receipt Generation</strong>: Automatically generates a
                                    downloadable PDF receipt with vote details.</li>
                                <li><strong>Error Handling</strong>: Displays alerts for voting failures
                                    and errors during data fetch or PDF generation.</li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Best Practices(Share with voters)</h2>
                            <ul>
                                <li>Vote for all available positions before generating the receipt to
                                    ensure full participation.</li>
                                <li>Review candidate details carefully before casting a vote, as it is
                                    final.</li>
                                <li>Keep the page open until the receipt is downloaded to avoid losing
                                    the record.</li>
                                <li>Check the countdown timer to ensure voting is completed before the
                                    election ends.</li>
                            </ul>
                        </div>

                        <div className={style.section}>
                            <h2>Troubleshooting</h2>
                            <ul>
                                <li><strong>Election Not Found</strong>: Verify the <code>electionId</code>
                                    in the URL. Contact the admin if the issue persists.</li>
                                <li><strong>Voter Session Expired</strong>: Return to the Voter Register
                                    page and re-authenticate with the OTP if the session is lost.</li>
                                <li><strong>Vote Not Recording</strong>: Ensure a stable internet connection
                                    and retry. Check for duplicate votes or election end status.</li>
                                <li><strong>Receipt Generation Failed</strong>: Ensure the logo image is
                                    available and retry. Contact support if the issue continues.</li>
                            </ul>
                            <p>For further assistance, reach out to the election administrator via the
                                provided support channels.</p>
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
};

export default Docs;
