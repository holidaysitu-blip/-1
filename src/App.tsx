import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './lib/components/Layout';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Market from './pages/Market';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Discovery from './pages/Discovery';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="courses" element={<Courses />} />
          <Route path="market" element={<Market />} />
          <Route path="discovery" element={<Discovery />} />
          <Route path="profile" element={<Profile />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}