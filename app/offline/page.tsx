export default function Offline() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">You're offline</h1>
        <p className="text-muted-foreground">
          It seems you're not connected to the internet. Please check your connection and try again.
        </p>
      </div>
    </div>
  );
}
