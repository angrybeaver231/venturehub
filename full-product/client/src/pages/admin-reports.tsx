import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { formatEventDate as formatEventDateUtil } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Download, FileSpreadsheet, TrendingUp, Users, Building2, Percent } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ru, enUS } from "date-fns/locale";

type ReportStatistics = {
  period: {
    startDate: string;
    endDate: string;
  };
  events: Array<{
    eventId: string;
    eventName: string;
    eventDate: string;
    totalRegistrations: number;
    financialUniversityStudents: number;
    percentage: number;
  }>;
  overall: {
    totalEvents: number;
    totalRegistrations: number;
    financialUniversityStudents: number;
    percentage: number;
  };
};

export default function AdminReports() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isRussian = language === "ru";
  
  usePageSEO({
    title: isRussian ? "Отчёты - Предпринимательский Клуб" : "Reports - Business Club",
    description: isRussian 
      ? "Формирование отчётов по мероприятиям" 
      : "Generate event reports",
  });

  const defaultEndDate = new Date();
  const defaultStartDate = startOfMonth(subMonths(new Date(), 2));
  
  const [startDate, setStartDate] = useState<Date>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date>(defaultEndDate);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const { data: reportData, isLoading, error, refetch } = useQuery<ReportStatistics>({
    queryKey: ['/api/admin/reports/statistics', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await fetch(`/api/admin/reports/statistics?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch report data');
      return response.json();
    },
    enabled: !!startDate && !!endDate,
  });

  const handleExportReport = async () => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        language: language,
      });
      
      const response = await fetch(`/api/admin/reports/export?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = isRussian 
        ? `Otchet_meropriyatiy_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.xlsx`
        : `Events_Report_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.xlsx`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: isRussian ? "Успешно" : "Success",
        description: isRussian ? "Отчёт успешно скачан" : "Report downloaded successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: isRussian ? "Ошибка" : "Error",
        description: isRussian ? "Не удалось скачать отчёт" : "Failed to download report",
      });
    }
  };

  const formatDate = (date: Date) => {
    return format(date, "PPP", { locale: isRussian ? ru : enUS });
  };

  const formatEventDate = (dateStr: string) => {
    return formatEventDateUtil(dateStr, isRussian ? 'ru' : 'en');
  };

  const handleQuickPeriod = (months: number) => {
    const end = new Date();
    const start = startOfMonth(subMonths(end, months - 1));
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="space-y-6" data-testid="admin-reports-page">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          {isRussian ? "Отчёты по мероприятиям" : "Event Reports"}
        </h1>
        <p className="text-muted-foreground">
          {isRussian 
            ? "Статистика регистраций и студентов Финансового Университета"
            : "Registration statistics and Financial University student data"
          }
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {isRussian ? "Выберите период" : "Select Period"}
          </CardTitle>
          <CardDescription>
            {isRussian 
              ? "Укажите даты для формирования отчёта"
              : "Choose date range for the report"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isRussian ? "С:" : "From:"}
              </span>
              <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[200px] justify-start text-left font-normal"
                    data-testid="button-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(startDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(date);
                        setIsStartOpen(false);
                      }
                    }}
                    locale={isRussian ? ru : enUS}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isRussian ? "По:" : "To:"}
              </span>
              <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[200px] justify-start text-left font-normal"
                    data-testid="button-end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(endDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(date);
                        setIsEndOpen(false);
                      }
                    }}
                    locale={isRussian ? ru : enUS}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickPeriod(1)}
                data-testid="button-period-1month"
              >
                {isRussian ? "1 месяц" : "1 month"}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickPeriod(3)}
                data-testid="button-period-3months"
              >
                {isRussian ? "3 месяца" : "3 months"}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickPeriod(6)}
                data-testid="button-period-6months"
              >
                {isRussian ? "6 месяцев" : "6 months"}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickPeriod(12)}
                data-testid="button-period-12months"
              >
                {isRussian ? "1 год" : "1 year"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isRussian ? "Мероприятий" : "Events"}
                    </p>
                    <p className="text-2xl font-bold" data-testid="text-total-events">
                      {reportData.overall.totalEvents}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isRussian ? "Всего регистраций" : "Total Registrations"}
                    </p>
                    <p className="text-2xl font-bold" data-testid="text-total-registrations">
                      {reportData.overall.totalRegistrations}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Building2 className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isRussian ? "Студенты ФУ" : "FU Students"}
                    </p>
                    <p className="text-2xl font-bold" data-testid="text-fu-students">
                      {reportData.overall.financialUniversityStudents}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-amber-500/10">
                    <Percent className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isRussian ? "Процент ФУ" : "FU Percentage"}
                    </p>
                    <p className="text-2xl font-bold" data-testid="text-fu-percentage">
                      {reportData.overall.percentage}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  {isRussian ? "Детализация по мероприятиям" : "Event Details"}
                </CardTitle>
                <CardDescription>
                  {isRussian 
                    ? `Найдено ${reportData.events.length} мероприятий за выбранный период`
                    : `Found ${reportData.events.length} events in selected period`
                  }
                </CardDescription>
              </div>
              <Button 
                onClick={handleExportReport}
                className="gap-2"
                data-testid="button-download-report"
              >
                <Download className="h-4 w-4" />
                {isRussian ? "Скачать Excel" : "Download Excel"}
              </Button>
            </CardHeader>
            <CardContent>
              {reportData.events.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>{isRussian ? "Название" : "Name"}</TableHead>
                        <TableHead>{isRussian ? "Дата" : "Date"}</TableHead>
                        <TableHead className="text-center">
                          {isRussian ? "Регистрации" : "Registrations"}
                        </TableHead>
                        <TableHead className="text-center">
                          {isRussian ? "Студенты ФУ" : "FU Students"}
                        </TableHead>
                        <TableHead className="text-center">
                          {isRussian ? "Процент" : "Percentage"}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.events.map((event, index) => (
                        <TableRow key={event.eventId} data-testid={`row-event-${event.eventId}`}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <a 
                              href={`/events/${event.eventId}`}
                              className="text-primary hover:underline"
                              data-testid={`link-event-${event.eventId}`}
                            >
                              {event.eventName}
                            </a>
                          </TableCell>
                          <TableCell>{formatEventDate(event.eventDate)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{event.totalRegistrations}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                              {event.financialUniversityStudents}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline"
                              className={
                                event.percentage >= 50 
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" 
                                  : ""
                              }
                            >
                              {event.percentage}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3} className="text-right">
                          {isRussian ? "ИТОГО:" : "TOTAL:"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge>{reportData.overall.totalRegistrations}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                            {reportData.overall.financialUniversityStudents}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            {reportData.overall.percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {isRussian 
                    ? "Нет мероприятий за выбранный период"
                    : "No events found in selected period"
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {isLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              {isRussian ? "Загрузка данных..." : "Loading data..."}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-destructive">
              {isRussian 
                ? "Ошибка при загрузке данных. Попробуйте ещё раз."
                : "Error loading data. Please try again."
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
