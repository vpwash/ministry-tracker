'use client';

export default function OfflineFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">You're offline</h1>
        <p className="text-muted-foreground mb-6">
          It seems you're not connected to the internet. Some features may not be available.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
