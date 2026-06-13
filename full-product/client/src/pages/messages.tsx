import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Search,
  Check,
  CheckCheck,
  AtSign,
  Users,
  MapPin,
  Briefcase,
  Building2,
  Heart,
  User as UserIcon,
  Calendar,
  Star
} from "lucide-react";
import type { ConversationWithParticipant, ChatMessageWithSender, User as UserType } from "@shared/schema";

// User profile type for directory
interface DirectoryUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  tag: string | null;
  company: string | null;
  position: string | null;
  category: string | null;
  city: string | null;
  interests: string | null;
  aboutMe: string | null;
  profileImageUrl: string | null;
}

export default function Messages() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"chats" | "people">("chats");
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithParticipant | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [peopleSearchQuery, setPeopleSearchQuery] = useState("");
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [autoStartUserId, setAutoStartUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<DirectoryUser | null>(null);
  const [profileTab, setProfileTab] = useState<"info" | "chat" | "meeting">("info");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<ConversationWithParticipant[]>({
    queryKey: ['/api/chat/conversations'],
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessageWithSender[]>({
    queryKey: [`/api/chat/conversations/${selectedConversation?.id}/messages`],
    enabled: !!selectedConversation?.id,
    refetchInterval: 3000,
  });

  // Fetch users for search (People directory)
  const { data: directoryData = { users: [], total: 0 } } = useQuery<{ users: DirectoryUser[], total: number }>({
    queryKey: ['/api/users/directory'],
    enabled: !!user && activeTab === "people",
  });

  // Search users
  const { data: searchResults = [] } = useQuery<DirectoryUser[]>({
    queryKey: ['/api/users/search', peopleSearchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(peopleSearchQuery)}`);
      if (!res.ok) throw new Error('Failed to search users');
      return res.json();
    },
    enabled: !!user && peopleSearchQuery.length > 0,
  });

  // Fetch unread count
  const { data: unreadData = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ['/api/chat/unread/count'],
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Start new conversation
  const startConversationMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      const res = await apiRequest('/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ recipientId }),
      });
      return await res.json();
    },
    onSuccess: async (data: any) => {
      setSelectedProfile(null);
      setActiveTab("chats");
      
      await queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      
      const result = await queryClient.fetchQuery<ConversationWithParticipant[]>({
        queryKey: ['/api/chat/conversations'],
        staleTime: 0,
      });
      
      const newConvo = result?.find((c: ConversationWithParticipant) => c.id === data.id);
      if (newConvo) {
        setSelectedConversation(newConvo);
      }
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToStartConversation"),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    if (userId && user && userId !== user.id) {
      setAutoStartUserId(userId);
      setLocation("/messages", { replace: true });
    }
  }, [user]);

  useEffect(() => {
    if (autoStartUserId && !startConversationMutation.isPending && !conversationsLoading) {
      const existingConvo = conversations.find(
        (c) => c.otherParticipant?.id === autoStartUserId
      );
      if (existingConvo) {
        setSelectedConversation(existingConvo);
        setAutoStartUserId(null);
      } else {
        startConversationMutation.mutate(autoStartUserId);
        setAutoStartUserId(null);
      }
    }
  }, [autoStartUserId, conversations, conversationsLoading]);

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation) throw new Error("No conversation selected");
      const mentions = extractMentions(messageInput);
      return await apiRequest(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: messageInput, mentions }),
      });
    },
    onSuccess: async () => {
      setMessageInput("");
      await queryClient.invalidateQueries({ queryKey: [`/api/chat/conversations/${selectedConversation?.id}/messages`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToSendMessage"),
        variant: "destructive",
      });
    },
  });

  // Extract @mentions from message content
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\S+)/g;
    const matches = text.match(mentionRegex);
    if (!matches) return [];
    return matches.map(m => m.slice(1));
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate();
  };

  const handleStartChatFromProfile = () => {
    if (!selectedProfile) return;
    startConversationMutation.mutate(selectedProfile.id);
  };

  // Handle input change for @mention detection
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || value[lastAtIndex - 1] === ' ')) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setShowMentionPopup(true);
        return;
      }
    }
    setShowMentionPopup(false);
  };

  // Insert mention into message
  const insertMention = () => {
    if (!selectedConversation) return;
    
    const name = getName(
      selectedConversation.otherUserFirstName,
      selectedConversation.otherUserLastName,
      selectedConversation.otherUserEmail
    ).replace(/\s+/g, '');
    
    const lastAtIndex = messageInput.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const newMessage = messageInput.slice(0, lastAtIndex) + `@${name} `;
      setMessageInput(newMessage);
    } else {
      setMessageInput(messageInput + `@${name} `);
    }
    setShowMentionPopup(false);
    inputRef.current?.focus();
  };

  // Render message content with highlighted mentions
  const renderMessageContent = (content: string, isOwn: boolean) => {
    const mentionRegex = /@(\S+)/g;
    const parts = content.split(mentionRegex);
    
    if (parts.length === 1) {
      return <span>{content}</span>;
    }
    
    return (
      <>
        {parts.map((part, i) => {
          if (i % 2 === 1) {
            return (
              <span 
                key={i} 
                className={`font-semibold ${isOwn ? 'text-primary-foreground' : 'text-primary'}`}
              >
                @{part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
      return t("today");
    } else if (d.toDateString() === yesterday.toDateString()) {
      return t("yesterday");
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return "?";
  };

  const getName = (firstName?: string | null, lastName?: string | null, email?: string | null) => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return email || t("unknownUser");
  };

  // Filter people based on search
  const displayedPeople = peopleSearchQuery.length > 0 ? searchResults : directoryData.users;

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("loginRequired")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between mb-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chats" | "people")} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="chats" className="gap-2" data-testid="tab-chats">
                <MessageCircle className="h-4 w-4" />
                {t("chats")}
                {unreadData.count > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">{unreadData.count}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="people" className="gap-2" data-testid="tab-people">
                <Users className="h-4 w-4" />
                {t("people")}
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {activeTab === "chats" ? (
          /* Chats Tab Content */
          <div className="h-full grid md:grid-cols-3 gap-4">
            {/* Conversations List */}
            <Card className={`md:col-span-1 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder={t("searchChats")} 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-chats"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                {conversationsLoading ? (
                  <div className="p-4 text-center text-muted-foreground">{t("loading")}</div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t("noChatsYet")}</p>
                    <p className="text-sm mt-1">{t("startChatFromPeople")}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversations
                      .filter(convo => {
                        if (!searchQuery) return true;
                        const name = getName(convo.otherUserFirstName, convo.otherUserLastName, convo.otherUserEmail).toLowerCase();
                        return name.includes(searchQuery.toLowerCase());
                      })
                      .map((convo) => (
                      <div
                        key={convo.id}
                        className={`p-3 cursor-pointer hover-elevate ${selectedConversation?.id === convo.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedConversation(convo)}
                        data-testid={`conversation-${convo.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>
                              {getInitials(convo.otherUserFirstName, convo.otherUserLastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">
                                {getName(convo.otherUserFirstName, convo.otherUserLastName, convo.otherUserEmail)}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(convo.lastMessageAt)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate ${convo.unreadCount > 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                                {convo.lastMessageContent || t("noMessages")}
                              </p>
                              {convo.unreadCount > 0 && (
                                <Badge variant="default" className="ml-2 text-xs">
                                  {convo.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>

            {/* Chat Area */}
            <Card className={`md:col-span-2 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => setSelectedConversation(null)}
                      data-testid="button-back-to-list"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(selectedConversation.otherUserFirstName, selectedConversation.otherUserLastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {getName(selectedConversation.otherUserFirstName, selectedConversation.otherUserLastName, selectedConversation.otherUserEmail)}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading ? (
                      <div className="text-center text-muted-foreground">{t("loading")}</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <p>{t("noMessagesYet")}</p>
                        <p className="text-sm">{t("sayHello")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg, index) => {
                          const isOwn = msg.senderId === user.id;
                          const showDate = index === 0 || 
                            new Date(msg.createdAt!).toDateString() !== new Date(messages[index - 1].createdAt!).toDateString();
                          
                          return (
                            <div key={msg.id}>
                              {showDate && (
                                <div className="text-center my-4">
                                  <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                                    {formatDate(msg.createdAt)}
                                  </span>
                                </div>
                              )}
                              <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                <div
                                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                                    isOwn
                                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                                      : 'bg-muted rounded-bl-sm'
                                  }`}
                                  data-testid={`message-${msg.id}`}
                                >
                                  <p className="whitespace-pre-wrap break-words">
                                    {renderMessageContent(msg.content, isOwn)}
                                  </p>
                                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                                    <span className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                      {formatTime(msg.createdAt)}
                                    </span>
                                    {isOwn && (
                                      msg.isRead ? (
                                        <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                                      ) : (
                                        <Check className="h-3 w-3 text-primary-foreground/70" />
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input with Mention Popup */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t">
                    <div className="relative">
                      {showMentionPopup && selectedConversation && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg p-2 z-50">
                          <div 
                            className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate"
                            onClick={insertMention}
                            data-testid="mention-suggestion"
                          >
                            <AtSign className="h-4 w-4 text-muted-foreground" />
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(selectedConversation.otherUserFirstName, selectedConversation.otherUserLastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {getName(selectedConversation.otherUserFirstName, selectedConversation.otherUserLastName, selectedConversation.otherUserEmail)}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          ref={inputRef}
                          value={messageInput}
                          onChange={handleMessageInputChange}
                          placeholder={t("typeMessage")}
                          className="flex-1"
                          data-testid="input-message"
                          disabled={sendMessageMutation.isPending}
                        />
                        <Button 
                          type="submit" 
                          size="icon"
                          disabled={!messageInput.trim() || sendMessageMutation.isPending}
                          data-testid="button-send"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t("selectChat")}</p>
                  <p className="text-sm">{t("selectChatPrompt")}</p>
                </div>
              )}
            </Card>
          </div>
        ) : (
          /* People Tab Content */
          <Card className="h-full flex flex-col">
            {/* Search Bar */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={t("searchPeople")}
                  className="pl-9"
                  value={peopleSearchQuery}
                  onChange={(e) => setPeopleSearchQuery(e.target.value)}
                  data-testid="input-search-people"
                />
              </div>
            </div>

            {/* People List */}
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {displayedPeople.map((person) => (
                  <div
                    key={person.id}
                    className="p-3 cursor-pointer hover-elevate flex items-center gap-3"
                    onClick={() => {
                      setSelectedProfile(person);
                      setProfileTab("info");
                    }}
                    data-testid={`person-${person.id}`}
                  >
                    <Avatar className="h-12 w-12">
                      {person.profileImageUrl && (
                        <AvatarImage src={person.profileImageUrl} alt={getName(person.firstName, person.lastName)} />
                      )}
                      <AvatarFallback>
                        {getInitials(person.firstName, person.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {getName(person.firstName, person.lastName, person.email)}
                        </p>
                        <span className="text-xs text-green-500">●</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {person.company || person.position || person.email}
                      </p>
                      {person.position && person.company && (
                        <p className="text-xs text-muted-foreground truncate">
                          {person.position}
                        </p>
                      )}
                    </div>
                    <Star className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                ))}
                {displayedPeople.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t("noUsersFound")}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>

      {/* User Profile Modal */}
      <Dialog open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          {selectedProfile && (
            <>
              {/* Profile Header */}
              <div className="flex flex-col items-center py-4">
                <Avatar className="h-24 w-24 mb-3">
                  {selectedProfile.profileImageUrl && (
                    <AvatarImage src={selectedProfile.profileImageUrl} alt={getName(selectedProfile.firstName, selectedProfile.lastName)} />
                  )}
                  <AvatarFallback className="text-2xl">
                    {getInitials(selectedProfile.firstName, selectedProfile.lastName)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  {getName(selectedProfile.firstName, selectedProfile.lastName, selectedProfile.email)}
                  <span className="text-green-500 text-sm">●</span>
                </h2>
                {selectedProfile.tag && (
                  <Badge variant="secondary" className="mt-1">@{selectedProfile.tag}</Badge>
                )}
              </div>

              {/* Profile Tabs */}
              <Tabs value={profileTab} onValueChange={(v) => setProfileTab(v as "info" | "chat" | "meeting")} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="info" className="gap-1" data-testid="profile-tab-info">
                    <UserIcon className="h-4 w-4" />
                    {t("info")}
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="gap-1" data-testid="profile-tab-chat">
                    <MessageCircle className="h-4 w-4" />
                    {t("chat")}
                  </TabsTrigger>
                  <TabsTrigger value="meeting" className="gap-1" data-testid="profile-tab-meeting">
                    <Calendar className="h-4 w-4" />
                    {t("meeting")}
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 mt-4">
                  <TabsContent value="info" className="m-0 space-y-4">
                    {/* Personal Information */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <UserIcon className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{t("personalInfo")}</h3>
                      </div>
                      <div className="pl-7 space-y-2">
                        {selectedProfile.city && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("city")}</p>
                            <p className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {selectedProfile.city}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Work */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{t("work")}</h3>
                      </div>
                      <div className="pl-7 space-y-2">
                        {selectedProfile.company && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("company")}</p>
                            <p className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {selectedProfile.company}
                            </p>
                          </div>
                        )}
                        {selectedProfile.category && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("userCategory")}</p>
                            <p>{selectedProfile.category}</p>
                          </div>
                        )}
                        {selectedProfile.position && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("userPosition")}</p>
                            <p>{selectedProfile.position}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Interests */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{t("interests")}</h3>
                      </div>
                      <div className="pl-7 space-y-2">
                        {selectedProfile.interests && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("lookingFor")}</p>
                            <p>{selectedProfile.interests}</p>
                          </div>
                        )}
                        {selectedProfile.aboutMe && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("aboutMe")}</p>
                            <p>{selectedProfile.aboutMe}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="chat" className="m-0">
                    <div className="flex flex-col items-center justify-center py-12">
                      <MessageCircle className="h-16 w-16 mb-4 text-primary opacity-50" />
                      <p className="text-center text-muted-foreground mb-4">
                        {t("startChatWith")} {getName(selectedProfile.firstName, selectedProfile.lastName)}
                      </p>
                      <Button 
                        onClick={handleStartChatFromProfile}
                        disabled={startConversationMutation.isPending}
                        data-testid="button-start-chat"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {t("sendMessage")}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="meeting" className="m-0">
                    <div className="flex flex-col items-center justify-center py-12">
                      <Calendar className="h-16 w-16 mb-4 text-primary opacity-50" />
                      <p className="text-center text-muted-foreground mb-4">
                        {t("scheduleMeetingWith")} {getName(selectedProfile.firstName, selectedProfile.lastName)}
                      </p>
                      <Button variant="outline" disabled>
                        <Calendar className="h-4 w-4 mr-2" />
                        {t("scheduleMeeting")}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">{t("comingSoon")}</p>
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
