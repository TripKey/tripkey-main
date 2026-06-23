// DaySummary — 확정 화면(SCR-05) 선택된 Day 의 요약 카드.
// 제목/설명 + 총 이동시간 / 총 소요시간.

type DaySummaryProps = {
  title: string;
  summary: string;
  totalMove: string;
  totalSpend: string;
};

const DaySummary = ({
  title,
  summary,
  totalMove,
  totalSpend,
}: DaySummaryProps) => {
  return (
    <section className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground">
            DAY SUMMARY
          </p>
          <h3 className="mt-1 text-lg font-bold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Stat label="총 이동시간" value={totalMove} />
          <Stat label="총 소요시간" value={totalSpend} />
        </div>
      </div>
    </section>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-muted px-3 py-2 text-center">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-sm font-bold text-foreground">{value}</p>
  </div>
);

export default DaySummary;
