import { useNavigate } from "react-router-dom";
import HeroSection from "./HeroSection";

function Home() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/speak");
  };

  return <HeroSection onGetStarted={handleGetStarted} />;
}

export default Home;