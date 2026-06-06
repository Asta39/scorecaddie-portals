import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/3 mb-1" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2 Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3 mt-2" />
          </CardHeader>
          <CardContent className="flex-1 pb-0 flex items-center justify-center">
            <Skeleton className="h-[250px] w-[250px] rounded-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Another 2 Charts Skeleton for Revenue and CategoryRank */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3 mt-2" />
          </CardHeader>
          <CardContent className="flex-1 pb-0 flex items-center justify-center">
            <Skeleton className="h-[250px] w-[250px] rounded-full" />
          </CardContent>
        </Card>
      </div>

      {/* CheckedInTable Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/4 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
