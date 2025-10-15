export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="liquid-glass p-8 max-w-md mx-auto text-center">
        <h1 className="text-4xl font-bold gradient-text mb-4">
          Timbre
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          Transform your videos with AI-generated music
        </p>
        <div className="space-y-4">
          <button className="w-full gradient-button text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 hover:scale-105">
            Get Started
          </button>
          <button className="w-full liquid-glass liquid-glass-hover py-3 px-6 rounded-lg font-medium">
            Join Waitlist
          </button>
        </div>
      </div>
    </main>
  )
}