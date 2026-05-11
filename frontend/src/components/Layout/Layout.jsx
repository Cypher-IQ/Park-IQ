import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout({ children, noFooter = false }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-16">
        {children}
      </main>
      {!noFooter && <Footer />}
    </div>
  )
}
