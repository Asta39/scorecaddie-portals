import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface PlatformStatusCardProps {
  title: string;
  value: string;
}

export function PlatformStatusCard({ title, value }: PlatformStatusCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
