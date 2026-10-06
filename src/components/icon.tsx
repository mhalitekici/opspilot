type IconName = "arrow" | "workflow" | "spark" | "layers" | "code" | "check" | "mail" | "chart";

const paths: Record<IconName, string> = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  workflow: "M8 5h8M12 8v8M5 16h14M5 16v3m14-3v3M9 2h6v6H9zM2 19h6v3H2zM16 19h6v3h-6z",
  spark: "m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z",
  layers: "m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5",
  code: "m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18",
  check: "m5 12 4 4L19 6",
  mail: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  chart: "M4 3v18h17M9 16v-5m5 5V7m5 9V4",
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
