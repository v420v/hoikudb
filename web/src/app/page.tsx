import Map from '@/components/Map';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      <div className="flex-1 overflow-hidden">
        <Map />
      </div>
      <Footer />
    </div>
  );
}
