"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { UserMessage, UserProfile } from "@/types/api";

interface ChatHistoryPageProps {
  params: Promise<{ login: string }>;
}

interface DayGroup {
  dayKey: string;
  dayLabel: string;
  messages: UserMessage[];
}

const PAGE_LIMIT = 200;

export default function UserChatHistoryPage({ params }: ChatHistoryPageProps) {
  const { login } = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllUserMessages = async (userId: number, search?: string): Promise<UserMessage[]> => {
      let page = 1;
      const allMessages: UserMessage[] = [];
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await apiClient.getUserMessages(userId, page, PAGE_LIMIT, search);

        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to load user messages");
        }

        allMessages.push(...response.data);
        totalPages = response.pagination?.totalPages || 1;
        page += 1;
      }

      return allMessages;
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const profileResponse = await apiClient.getUserProfileByLogin(login);
        if (!profileResponse.success || !profileResponse.data) {
          setError(profileResponse.error || "User not found");
          setLoading(false);
          return;
        }

        setProfile(profileResponse.data);

        const allMessages = await fetchAllUserMessages(profileResponse.data.id, activeSearch || undefined);
        setMessages(allMessages);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load chat history");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeSearch, login]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const grouped: Record<string, DayGroup> = {};

    for (const message of messages) {
      const timestamp = new Date(message.timestamp);
      const dayKey = timestamp.toISOString().slice(0, 10);

      if (!grouped[dayKey]) {
        grouped[dayKey] = {
          dayKey,
          dayLabel: timestamp.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          messages: [],
        };
      }

      grouped[dayKey].messages.push(message);
    }

    return Object.values(grouped).sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1));
  }, [messages]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setActiveSearch("");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading chat history...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href={`/profiles/${login}`} className="text-purple-400 hover:text-purple-300 transition-colors text-sm mb-4 inline-block">
          ← Back to Profile
        </Link>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-2">Failed to load chat history</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/profiles/${login}`} className="text-purple-400 hover:text-purple-300 transition-colors text-sm mb-4 inline-block">
          ← Back to {profile.displayName}
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{profile.displayName}&apos;s Chat History</h1>
        <p className="text-gray-400 text-sm">
          {messages.length.toLocaleString()} message{messages.length !== 1 ? "s" : ""}
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-6 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search messages"
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors">
          Search
        </button>
        <button type="button" onClick={clearSearch} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors">
          Clear
        </button>
      </form>

      {dayGroups.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
          <p className="text-gray-400">No messages found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dayGroups.map((group) => (
            <section key={group.dayKey} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <header className="px-4 py-3 bg-gray-900/60 border-b border-gray-700">
                <h2 className="text-sm font-semibold text-gray-300">{group.dayLabel}</h2>
              </header>

              <ul className="divide-y divide-gray-700">
                {group.messages.map((message) => (
                  <li key={message.id} className="px-4 py-3">
                    <div className="text-xs text-gray-500 mb-1">
                      {new Date(message.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </div>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{message.content}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
