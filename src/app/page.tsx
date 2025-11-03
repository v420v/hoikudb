import Map from '@/components/Map';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="w-full h-[var(--app-vh)] bg-gray-100 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <Map />
      </div>
      <Footer />
    </div>
  );
}
