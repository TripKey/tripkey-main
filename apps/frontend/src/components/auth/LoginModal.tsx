import logoUrl from '@/assets/logo2.png';
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
      <DialogContent className="overflow-hidden p-0 sm:max-w-sm">
        <div className="bg-linear-to-br from-primary/20 via-primary/5 to-background px-6 pt-9 pb-6 text-center">
          <img
            src={logoUrl}
            alt="TripKey"
            className="mx-auto mb-3 h-10 w-auto"
          />
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              여행을 시작해볼까요?
            </DialogTitle>
            <DialogDescription>
              로그인하면 만든 여행 계획을 저장할 수 있어요.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* 버튼 영역 */}
        <div className="flex flex-col gap-2.5 px-6 pb-6">
          <Button
            disabled
            className="relative h-11 w-full bg-[#FEE500] text-[15px] font-semibold text-[#191600] hover:bg-[#FDD835]"
            onClick={() => handleSocialLogin('kakao')}
          >
            <KakaoIcon className="absolute top-1/2 left-4 size-4.5 -translate-y-1/2" />
            카카오로 시작하기
          </Button>
          <Button
            disabled
            className="relative h-11 w-full bg-[#03C75A] text-[15px] font-semibold text-white hover:bg-[#02B350]"
            onClick={() => handleSocialLogin('naver')}
          >
            <NaverIcon className="absolute top-1/2 left-4 size-4.5 -translate-y-1/2" />
            네이버로 시작하기
          </Button>
          <Button
            disabled
            variant="outline"
            className="relative h-11 w-full bg-white text-[15px] font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={() => handleSocialLogin('google')}
          >
            <GoogleIcon className="absolute top-1/2 left-4 size-4.5 -translate-y-1/2" />
            구글로 시작하기
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            소셜 로그인은 준비 중이에요
          </p>

          <div className="my-1 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">또는</span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          {/* 지금 유일하게 동작하는 경로 → 주 버튼으로 강조 */}
          <Button className="h-11 w-full" onClick={goOnboarding}>
            게스트로 시작하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;

// 브랜드 로고 마크 (인라인 SVG). 구글은 고유 4색, 카카오/네이버는 버튼 글자색(currentColor) 상속.
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 18 18" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
    />
  </svg>
);

const KakaoIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 22 22"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 3C6.48 3 2 6.54 2 10.9c0 2.76 1.83 5.19 4.6 6.58-.2.72-.73 2.65-.83 3.06-.13.5.18.5.39.36.16-.11 2.6-1.77 3.66-2.49.71.1 1.44.16 2.18.16 5.52 0 10-3.54 10-7.63S17.52 3 12 3z" />
  </svg>
);

const NaverIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 25 25"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M16.27 12.84 7.4 0H0v24h7.73V11.16L16.6 24H24V0h-7.73v12.84z" />
  </svg>
);
