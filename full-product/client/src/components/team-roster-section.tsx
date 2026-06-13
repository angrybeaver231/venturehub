import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Linkedin,
  Twitter,
  Youtube,
  Plus,
  Trash2,
  Users2,
  ExternalLink,
  Crown,
} from "lucide-react";
import { SiVk, SiHabr } from "react-icons/si";
import type { TeamMember } from "@shared/schema";

type Props = { startupId: string; canEdit: boolean };

const EMPTY = {
  fullName: "",
  role: "",
  isFounder: false,
  linkedinUrl: "",
  twitterHandle: "",
  vkUrl: "",
  habrCareerUrl: "",
  youtubeChannelId: "",
};

export function TeamRosterSection({ startupId, canEdit }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: members = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/startups", startupId, "team-members"],
    enabled: !!startupId,
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof EMPTY) => {
      return await apiRequest(`/api/startups/${startupId}/team-members`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "team-members"] });
      toast({ title: t("teamMemberAdded") });
      setOpen(false);
      setForm({ ...EMPTY });
    },
    onError: (e: Error) => toast({ title: t("error"), description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/startups/${startupId}/team-members/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "team-members"] });
    },
  });

  return (
    <Card data-testid="card-team-roster-section">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            {t("teamRoster")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("teamRosterHelp")}</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setOpen(true)} data-testid="button-add-team-member">
            <Plus className="h-4 w-4 mr-1" />
            {t("addPerson")}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-team-members">
            {t("noTeamRosterYet")}
          </p>
        ) : (
          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3"
                data-testid={`row-team-member-${m.id}`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" data-testid={`text-team-member-name-${m.id}`}>
                      {m.fullName}
                    </p>
                    {m.isFounder && (
                      <Badge variant="secondary" className="gap-1">
                        <Crown className="h-3 w-3" />
                        {t("founder")}
                      </Badge>
                    )}
                    {m.role && (
                      <span className="text-xs text-muted-foreground">{m.role}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {m.linkedinUrl && (
                      <a
                        href={m.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        data-testid={`link-linkedin-${m.id}`}
                      >
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {m.twitterHandle && (
                      <a
                        href={`https://x.com/${m.twitterHandle.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        data-testid={`link-twitter-${m.id}`}
                      >
                        <Twitter className="h-3 w-3" />
                        {m.twitterHandle}
                      </a>
                    )}
                    {m.vkUrl && (
                      <a
                        href={m.vkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        data-testid={`link-vk-${m.id}`}
                      >
                        <SiVk className="h-3 w-3" />
                        VK
                      </a>
                    )}
                    {m.habrCareerUrl && (
                      <a
                        href={m.habrCareerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        data-testid={`link-habr-${m.id}`}
                      >
                        <SiHabr className="h-3 w-3" />
                        Habr Career
                      </a>
                    )}
                    {m.youtubeChannelId && (
                      <a
                        href={`https://www.youtube.com/channel/${m.youtubeChannelId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        data-testid={`link-youtube-${m.id}`}
                      >
                        <Youtube className="h-3 w-3" />
                        YouTube
                      </a>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(m.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-team-member-${m.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="dialog-add-team-member">
          <DialogHeader>
            <DialogTitle>{t("addPerson")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="tm-name">{t("fullName")}</Label>
              <Input
                id="tm-name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                data-testid="input-team-member-name"
              />
            </div>
            <div>
              <Label htmlFor="tm-role">{t("roleTitle")}</Label>
              <Input
                id="tm-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                data-testid="input-team-member-role"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="tm-founder"
                checked={form.isFounder}
                onCheckedChange={(c) => setForm({ ...form, isFounder: !!c })}
                data-testid="checkbox-team-member-founder"
              />
              <Label htmlFor="tm-founder" className="font-normal">
                {t("isFounder")}
              </Label>
            </div>
            <div>
              <Label htmlFor="tm-linkedin">LinkedIn URL</Label>
              <Input
                id="tm-linkedin"
                value={form.linkedinUrl}
                onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                placeholder="https://www.linkedin.com/in/..."
                data-testid="input-team-member-linkedin"
              />
            </div>
            <div>
              <Label htmlFor="tm-twitter">X / Twitter handle</Label>
              <Input
                id="tm-twitter"
                value={form.twitterHandle}
                onChange={(e) => setForm({ ...form, twitterHandle: e.target.value })}
                placeholder="@handle"
                data-testid="input-team-member-twitter"
              />
            </div>
            <div>
              <Label htmlFor="tm-vk">VK URL</Label>
              <Input
                id="tm-vk"
                value={form.vkUrl}
                onChange={(e) => setForm({ ...form, vkUrl: e.target.value })}
                placeholder="https://vk.com/..."
                data-testid="input-team-member-vk"
              />
            </div>
            <div>
              <Label htmlFor="tm-habr">Habr Career URL</Label>
              <Input
                id="tm-habr"
                value={form.habrCareerUrl}
                onChange={(e) => setForm({ ...form, habrCareerUrl: e.target.value })}
                placeholder="https://career.habr.com/..."
                data-testid="input-team-member-habr"
              />
            </div>
            <div>
              <Label htmlFor="tm-yt">YouTube Channel ID</Label>
              <Input
                id="tm-yt"
                value={form.youtubeChannelId}
                onChange={(e) => setForm({ ...form, youtubeChannelId: e.target.value })}
                placeholder="UCxxxx..."
                data-testid="input-team-member-youtube"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.fullName || createMutation.isPending}
              data-testid="button-save-team-member"
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
