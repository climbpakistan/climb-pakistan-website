import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './hooks/ThemeContext';
import Layout from './components/Layout';

import Home from './pages/Home';
import News from './pages/News';
import Article from './pages/Article';
import Athletes from './pages/Athletes';
import Athlete from './pages/Athlete';
import Rankings from './pages/Rankings';
import Competitions from './pages/Competitions';
import Competition from './pages/Competition';
import Learn from './pages/Learn';
import LearnArticle from './pages/LearnArticle';
import About from './pages/About';
import Contact from './pages/Contact';
import Thanks from './pages/Thanks';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:slug" element={<Article />} />
              <Route path="/athletes" element={<Athletes />} />
              <Route path="/athletes/:slug" element={<Athlete />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/competitions" element={<Competitions />} />
              <Route path="/competitions/:slug" element={<Competition />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/learn/:slug" element={<LearnArticle />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/thanks" element={<Thanks />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  );
}
