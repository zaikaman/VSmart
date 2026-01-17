import { StartButton } from '@/components/auth/StartButton';
import NavigationBarClient from './NavigationBarClient';

// Server Component wrapper để kết hợp client navigation với server StartButton
export default function NavigationBar() {
  return <NavigationBarClient startButton={<StartButton>Bắt đầu ngay</StartButton>} />;
}
