"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeaderboardTable } from "@/components/participant/leaderboard-table";
import { getEventLeaderboardHandler } from "@/modules/leaderboard/leaderboard.actions";
import type {
  EventLeaderboardEntry,
  GlobalLeaderboardEntry,
} from "@/modules/leaderboard/leaderboard.types";

type LeaderboardViewProps = {
  globalEntries: GlobalLeaderboardEntry[];
  registeredEvents: { id: number; name: string }[];
  currentUserId: number;
};

export function LeaderboardView({
  globalEntries,
  registeredEvents,
  currentUserId,
}: LeaderboardViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventEntries, setEventEntries] = useState<EventLeaderboardEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleEventChange(value: string | null) {
    setSelectedEventId(value);
    if (!value) {
      setEventEntries([]);
      return;
    }

    startTransition(async () => {
      const result = await getEventLeaderboardHandler(Number(value));
      setEventEntries(result.success ? result.data ?? [] : []);
    });
  }

  return (
    <Tabs defaultValue="global">
      <TabsList className="w-full">
        <TabsTrigger value="global">General</TabsTrigger>
        <TabsTrigger value="event" disabled={registeredEvents.length === 0}>
          Por evento
        </TabsTrigger>
      </TabsList>

      <TabsContent value="global" className="pt-4">
        <LeaderboardTable
          variant="global"
          entries={globalEntries}
          currentUserId={currentUserId}
        />
      </TabsContent>

      <TabsContent value="event" className="space-y-4 pt-4">
        {registeredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Inscríbete a un evento para ver su ranking.
          </p>
        ) : (
          <>
            <Select value={selectedEventId} onValueChange={handleEventChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí un evento" />
              </SelectTrigger>
              <SelectContent>
                {registeredEvents.map((event) => (
                  <SelectItem key={event.id} value={String(event.id)}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedEventId &&
              (isPending ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Cargando...
                </p>
              ) : (
                <LeaderboardTable
                  variant="event"
                  entries={eventEntries}
                  currentUserId={currentUserId}
                />
              ))}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
