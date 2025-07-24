import React from 'react';
import { BrowserRouter as Router, Routes, Route} from "react-router-dom";
import AdminDashboard from "./pages/dashboardPage/adminDashboard";
import CreateElections from "./pages/createElectionsPage/createElections";
import Docs from "./pages/docs/docs";
import ECManagement from "./pages/ecMgtPage/ecManagement";
import AdminLogin from "./pages/loginPage/adminLogin";
import VoterRegister from "./pages/voterRegister/voterRegister";
import VoterVotes from "./pages/votersVoting/voterVotes";
import NotFound from './pages/notFound';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route path="/adminDashboard" element={<AdminDashboard />} />
        <Route path="/createElections" element={<CreateElections />} />
        <Route path="/voterRegister" element={<VoterRegister />} />
        <Route path="/voterVotes" element={<VoterVotes />} />
        <Route path="/ecManagement" element={<ECManagement />} />
        <Route path='/docs' element={<Docs />} />
        <Route path='*' element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
