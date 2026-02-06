interface StepHeaderProps {
  title: string;
  subtitle?: string;
}

export function StepHeader({ title, subtitle }: StepHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-[32px] font-normal leading-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="text-base text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
