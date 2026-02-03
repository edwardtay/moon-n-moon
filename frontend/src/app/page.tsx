import { Navbar } from "@/components/navbar";
import { siteConfig } from "@/config/site";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <h1 className="text-4xl font-bold tracking-tight">
          {siteConfig.name}
        </h1>
        <p className="text-muted-foreground text-lg max-w-md text-center">
          {siteConfig.description}
        </p>
      </main>
    </div>
  );
}
