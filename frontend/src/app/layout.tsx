import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Apex AI - Interview Prep Kit Generator',
  description: 'AI-Powered Custom Interview Preparation Kits for Software Engineers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
            Apex AI Interview Prep Kit • Built with Next.js 14, Express, Groq LLM & Tailwind CSS
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
