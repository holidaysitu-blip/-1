import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './lib/components/Layout';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Market from './pages/Market';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import CatStory from './pages/CatStory';
import Admin from './components/Admin';
import ContentAdmin from './components/ContentAdmin';
import MemberGate from './components/MemberGate';
import UpdateLinks from './components/UpdateLinks';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/content-admin" element={<ContentAdmin />} />
        <Route path="/cat-story/:slug" element={<MemberGate><CatStory /></MemberGate>} />
        <Route path="/update-links" element={<UpdateLinks />} />
        <Route path="/updates" element={<UpdateLinks />} />

        <Route path="/" element={<MemberGate><Layout /></MemberGate>}>
          <Route index element={<Home />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:id" element={<Courses />} />
          <Route path="market" element={<Market />} />
          <Route path="profile" element={<Profile />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
