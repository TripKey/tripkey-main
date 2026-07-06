import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/utils/auth-store';

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
};

const LoginModal = ({ open, onOpenChange, onProceed }: LoginModalProps) => {
  const login = useAuthStore((s) => s.login);

  const goOnboarding = () => {
    onOpenChange(false);
    onProceed();
  };

  const PROVIDER_LABEL: Record<'google' | 'kakao' | 'naver', string> = {
    google: '구글 사용자',
    kakao: '카카오 사용자',
    naver: '네이버 사용자',
  };
  // 목: 소셜 버튼 누르면 가짜 유저로 로그인.
  const handleSocialLogin = (provider: 'google' | 'kakao' | 'naver') => {
    login({
      id: `mock-${provider}`,
      name: PROVIDER_LABEL[provider],
      email: `${provider}@example.com`,
    });
    goOnboarding();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>여행을 시작해볼까요?</DialogTitle>
          <DialogDescription>
            로그인하면 만든 여행 계획을 저장할 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin('google')}
          >
            구글로 계속하기
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin('kakao')}
          >
            카카오로 시작하기
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin('naver')}
          >
            네이버로 시작하기
          </Button>

          <div className="my-1 text-center text-xs text-muted-foreground">
            또는
          </div>

          <Button variant="ghost" className="w-full" onClick={goOnboarding}>
            로그인 없이 게스트로 시작
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
