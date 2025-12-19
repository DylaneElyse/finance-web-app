export default function Footer() {
  return (  
  <footer className="w-full max-w-3xl p-4 flex justify-center items-center">
    <p className="text-sm text-muted-foreground">
      &copy; {new Date().getFullYear()} Finance Tracker App. All rights
      reserved.
    </p>
  </footer>
  );
}