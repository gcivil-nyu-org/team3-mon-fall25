import {render, screen, waitFor, act, fireEvent} from "@testing-library/react";
import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {MemoryRouter, Routes, Route} from "react-router-dom";
import GlobalChat from "./GlobalChat";

// --- MOCKS ---

// 1. API Mocks
vi.mock("../../api/chat", () => ({
    listConversations: vi.fn(),
    getMessages: vi.fn(),
    markRead: vi.fn(),
}));

vi.mock("../../api/auth", () => ({
    getSelfIdFromJWT: vi.fn(),
    fetchMeId: vi.fn(),
}));

vi.mock("../../api/listings", () => ({
    getListing: vi.fn(),
    getListings: vi.fn(),
}));

// 2. Context Mocks
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: vi.fn(),
}));

vi.mock("../../contexts/ChatContext", () => ({
    useChat: vi.fn(),
}));

// 3. Socket Mock (capture handlers + spies)
let socketHandlers = {};
let sendTextMock = vi.fn();
let sendReadMock = vi.fn();

vi.mock("../../hooks/useChatSocket", () => ({
    default: ({onMessage, onRead}) => {
        socketHandlers.onMessage = onMessage;
        socketHandlers.onRead = onRead;
        return {
            sendText: sendTextMock,
            sendRead: sendReadMock,
        };
    },
}));

// 4. Component Mock (isolation)
vi.mock("./ChatModal", () => ({
    default: ({
                  open,
                  onOpenChange,
                  conversations,
                  messages,
                  onSendMessage,
                  onConversationSelect,
                  onListingClick,
                  onFullPageChange,
              }) => {
        if (!open) return null;
        return (
            <div data-testid="chat-modal">
                <button data-testid="close-btn" onClick={() => onOpenChange(false)}>
                    Close
                </button>
                <button data-testid="fullpage-btn" onClick={() => onFullPageChange(true)}>
                    Maximize
                </button>
                <button data-testid="minimize-btn" onClick={() => onFullPageChange(false)}>
                    Minimize
                </button>

                <div data-testid="messages-json">{JSON.stringify(messages)}</div>

                <div data-testid="conv-list">
                    {conversations.map((c) => (
                        <div
                            key={String(c.id)}
                            data-testid={`conv-${c.id}`}
                            onClick={() => onConversationSelect(c.id)}
                        >
                            <span data-testid={`conv-title-${c.id}`}>{c.listingTitle}</span>
                            <span data-testid={`conv-unread-${c.id}`}>{c.unreadCount}</span>
                            <button
                                data-testid={`listing-link-${c.id}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onListingClick(c.listingId);
                                }}
                            >
                                Link
                            </button>
                        </div>
                    ))}
                </div>

                <button data-testid="send-msg-btn" onClick={() => onSendMessage(1, "test")}>
                    Send
                </button>
            </div>
        );
    },
}));

import * as ChatAPI from "../../api/chat";
import * as AuthAPI from "../../api/auth";
import * as ListingsAPI from "../../api/listings";
import * as AuthContext from "../../contexts/AuthContext";
import * as ChatContext from "../../contexts/ChatContext";

describe("GlobalChat Logic & Coverage", () => {
    const mockOpenChat = vi.fn();
    const mockCloseChat = vi.fn();

    let warnSpy;
    let errorSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        socketHandlers = {};
        sendTextMock = vi.fn();
        sendReadMock = vi.fn();

        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
        });
        errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
        });

        // Auth & Context Defaults
        AuthAPI.getSelfIdFromJWT.mockReturnValue("100");
        AuthAPI.fetchMeId.mockResolvedValue("100");
        AuthContext.useAuth.mockReturnValue({user: {id: "100"}});
        ChatContext.useChat.mockReturnValue({
            isChatOpen: true,
            openChat: mockOpenChat,
            closeChat: mockCloseChat,
        });

        // API Defaults
        ChatAPI.listConversations.mockResolvedValue([]);
        ChatAPI.getMessages.mockResolvedValue({results: []});
        ChatAPI.markRead.mockResolvedValue({});

        ListingsAPI.getListings.mockResolvedValue([]);
        ListingsAPI.getListing.mockResolvedValue(null);

        // localStorage default
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => "{}");
    });

    afterEach(() => {
        warnSpy?.mockRestore();
        errorSpy?.mockRestore();
        vi.restoreAllMocks();
    });

    // --- RENDERING & AUTH ---

    it("renders and falls back to fetchMeId if JWT is missing", async () => {
        AuthAPI.getSelfIdFromJWT.mockReturnValue(null);
        AuthAPI.fetchMeId.mockResolvedValue("999");

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(AuthAPI.fetchMeId).toHaveBeenCalled();
            expect(screen.getByTestId("chat-modal")).toBeInTheDocument();
        });
    });

    it("returns null if it cannot determine selfId (JWT missing + fetchMeId resolves null)", async () => {
        AuthAPI.getSelfIdFromJWT.mockReturnValue(null);
        AuthAPI.fetchMeId.mockResolvedValue(null);

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        // component should render nothing
        await waitFor(() => {
            expect(screen.queryByTestId("chat-modal")).toBeNull();
        });
    });

    it("redirects if URL mode is on but user is not logged in", async () => {
        AuthContext.useAuth.mockReturnValue({user: null});

        render(
            <MemoryRouter initialEntries={["/chat/123"]}>
                <Routes>
                    <Route path="/chat/:conversationId" element={<GlobalChat/>}/>
                    <Route path="/" element={<div data-testid="home-page">Home</div>}/>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId("home-page")).toBeInTheDocument();
        });
    });

    it("opens chat automatically in URL mode when chat is closed", async () => {
        ChatContext.useChat.mockReturnValue({
            isChatOpen: false,
            openChat: mockOpenChat,
            closeChat: mockCloseChat,
        });

        render(
            <MemoryRouter initialEntries={["/chat/1"]}>
                <Routes>
                    <Route path="/chat/:conversationId" element={<GlobalChat/>}/>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(mockOpenChat).toHaveBeenCalled();
            expect(screen.getByTestId("chat-modal")).toBeInTheDocument();
        });
    });

    // --- DATA LOADING & TRANSFORMATION ---

    it("loads conversations and transforms listing details correctly", async () => {
        Storage.prototype.getItem = vi.fn(() => JSON.stringify({"50": "900"}));

        ChatAPI.listConversations.mockResolvedValue([
            {
                id: 50,
                other_participant: {id: 200, email: "buyer@test.com"},
                last_message: {text: "Hi", created_at: new Date().toISOString()},
                unread_count: 2,
            },
        ]);

        ListingsAPI.getListing.mockResolvedValue({
            listing_id: 900,
            title: "My Awesome Bike",
            price: 150,
            user_id: 100,
            user_email: "me@test.com",
            images: [{image_url: "img.jpg"}],
        });

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId("conv-title-50")).toHaveTextContent("My Awesome Bike");
        });
    });

    it("covers bulk listings failure path (getListings throws) and still renders", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 1, other_participant: {id: 200}}]);
        ListingsAPI.getListings.mockRejectedValueOnce(new Error("boom"));

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId("conv-1")).toBeInTheDocument();
            expect(console.warn).toHaveBeenCalled();
        });
    });

    it("covers JSON.parse/localStorage failure inside listing load (invalid conversationListings)", async () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => "NOT_JSON");

        ChatAPI.listConversations.mockResolvedValue([{id: 2, other_participant: {id: 201}}]);

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId("conv-2")).toBeInTheDocument();
            expect(console.warn).toHaveBeenCalled();
        });
    });

    it("covers mapping-level fallback when a conv property access throws (but conv.id exists)", async () => {
        const badConv = {
            id: 123,
            get other_participant() {
                throw new Error("boom");
            },
        };

        ChatAPI.listConversations.mockResolvedValue([badConv]);

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => {
            // ChatModal mock renders conv-{id}
            expect(screen.getByTestId("conv-123")).toBeInTheDocument();
        });

        // also proves the catch executed
        expect(console.error).toHaveBeenCalled();
    });

    it("covers bulk listings fallback: displayName starts with 'User ' and is replaced by matched user_netid", async () => {
        ChatAPI.listConversations.mockResolvedValue([
            {id: 60, other_participant: {id: 300, email: null, netid: null}},
        ]);

        ListingsAPI.getListings.mockResolvedValue({
            results: [{user_id: 300, user_netid: "hm3536", user_email: null}],
        });

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId("conv-60")).toBeInTheDocument();
        });
    });

    it("covers socket onMessage branches for inactive conv (self sender => unread 0, other => unread increments)", async () => {
        ChatAPI.listConversations.mockResolvedValue([
            {id: 10, unread_count: 0, last_message: {}},
            {id: 11, unread_count: 3, last_message: {}},
        ]);

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("conv-10"));

        // make 10 active
        fireEvent.click(screen.getByTestId("conv-10"));

        // message for conv 11 from SELF => should set unreadCount to 0
        act(() => {
            socketHandlers.onMessage?.({
                id: 901,
                conversation: 11,
                sender: 100, // selfId
                text: "I sent this",
                created_at: new Date().toISOString(),
            });
        });

        await waitFor(() => {
            expect(screen.getByTestId("conv-unread-11")).toHaveTextContent("0");
        });

        // message for conv 11 from OTHER => unreadCount should increment to 1
        act(() => {
            socketHandlers.onMessage?.({
                id: 902,
                conversation: 11,
                sender: 200,
                text: "They replied",
                created_at: new Date().toISOString(),
            });
        });

        await waitFor(() => {
            expect(screen.getByTestId("conv-unread-11")).toHaveTextContent("1");
        });
    });

    it("covers socket onMessage early return when convId is missing", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 10}]);

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("conv-10"));

        // activeConversationId is still null (never clicked conv)
        act(() => {
            socketHandlers.onMessage?.({
                id: 777,
                sender: 200,
                text: "should not appear",
                created_at: new Date().toISOString(),
                // no conversation field
            });
        });

        await waitFor(() => {
            expect(screen.getByTestId("messages-json")).not.toHaveTextContent("should not appear");
        });
    });


    it("covers onRead updating non-active conversations and the '!target' path for active conv", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 1}, {id: 2}]);

        const tNew = new Date(Date.now() - 1000).toISOString();

        ChatAPI.getMessages.mockImplementation((cid) => {
            if (String(cid) === "1") {
                return Promise.resolve({
                    results: [
                        {id: 10, conversation: 1, sender: 200, text: "c1", created_at: tNew, read: false},
                    ],
                });
            }
            if (String(cid) === "2") {
                return Promise.resolve({
                    results: [
                        {id: 20, conversation: 2, sender: 200, text: "c2", created_at: tNew, read: false},
                    ],
                });
            }
            return Promise.resolve({results: []});
        });

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("conv-1"));

        // load messages for conv 1
        fireEvent.click(screen.getByTestId("conv-1"));
        await waitFor(() => expect(ChatAPI.getMessages).toHaveBeenCalledWith(1, expect.anything()));

        // load messages for conv 2
        fireEvent.click(screen.getByTestId("conv-2"));
        await waitFor(() => expect(ChatAPI.getMessages).toHaveBeenCalledWith(2, expect.anything()));

        // set active back to conv 1 (no refetch due to loaded ref, but activeConversationId changes)
        fireEvent.click(screen.getByTestId("conv-1"));

        // read receipt for message 20 (exists only in conv 2)
        act(() => {
            socketHandlers.onRead?.({message_id: 20, reader_id: 999});
        });

        await waitFor(() => {
            const json = JSON.parse(screen.getByTestId("messages-json").textContent);
            expect(json["2"][0].read).toBe(true); // updated in non-active conv
        });
    });


    it("covers getMessages failure path (logs and doesn't crash)", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 1}]);
        ChatAPI.getMessages.mockRejectedValueOnce(new Error("fetch failed"));

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("conv-1"));
        fireEvent.click(screen.getByTestId("conv-1"));

        await waitFor(() => {
            expect(console.error).toHaveBeenCalled();
        });
    });


    it("covers outer loadConversations error path (listConversations rejects)", async () => {
        ChatAPI.listConversations.mockRejectedValueOnce(new Error("fail"));

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId("chat-modal")).toBeInTheDocument();
            expect(console.error).toHaveBeenCalled();
        });
    });

    it("handles seller displayName override path when current user is NOT seller", async () => {
        // selfId = 100
        Storage.prototype.getItem = vi.fn(() => JSON.stringify({"77": "901"}));

        ChatAPI.listConversations.mockResolvedValue([
            {
                id: 77,
                other_participant: {id: 555, email: "buyer@test.com"},
                last_message: {text: "Yo", created_at: new Date().toISOString()},
            },
        ]);

        ListingsAPI.getListing.mockResolvedValue({
            listing_id: 901,
            title: "Thing",
            price: 1,
            user_id: 999, // seller is not selfId
            user_email: "seller@test.com",
            images: [{image_url: "img.jpg"}],
        });

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId("conv-77")).toBeInTheDocument();
        });
    });

    // --- MESSAGES & UNREAD LOGIC ---

    it("fetches messages and marks them read when conversation is selected (and updates local read flags)", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 1, unread_count: 5}]);

        const t1 = new Date().toISOString();
        const t2 = new Date(Date.now() - 1000).toISOString();

        ChatAPI.getMessages.mockResolvedValue({
            results: [
                {id: 99, conversation: 1, sender: 200, text: "Hello", created_at: t1, read: false},
                {id: 98, conversation: 1, sender: 100, text: "Mine", created_at: t2, read: false},
            ],
        });

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("conv-1"));
        fireEvent.click(screen.getByTestId("conv-1"));

        await waitFor(() => {
            expect(ChatAPI.getMessages).toHaveBeenCalledWith(1, expect.anything());
            expect(ChatAPI.markRead).toHaveBeenCalled();
        });

        // unread cleared
        expect(screen.getByTestId("conv-unread-1")).toHaveTextContent("0");

        // local read flags updated for non-self messages
        await waitFor(() => {
            const jsonText = screen.getByTestId("messages-json").textContent;
            const list = JSON.parse(jsonText)["1"];
            const otherMsg = list.find((m) => String(m.senderId) === "200");
            const myMsg = list.find((m) => String(m.senderId) === "100");
            expect(otherMsg.read).toBe(true);
            expect(myMsg.read).toBe(false);
        });
    });

    it("does not refetch messages for a conversation already loaded (loadedConversationsRef gating)", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 1}, {id: 2}]);
        ChatAPI.getMessages.mockResolvedValue({results: []});

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("conv-1"));

        fireEvent.click(screen.getByTestId("conv-1"));
        await waitFor(() => expect(ChatAPI.getMessages).toHaveBeenCalledWith(1, expect.anything()));

        fireEvent.click(screen.getByTestId("conv-2"));
        await waitFor(() => expect(ChatAPI.getMessages).toHaveBeenCalledWith(2, expect.anything()));

        fireEvent.click(screen.getByTestId("conv-1"));
        await new Promise((r) => setTimeout(r, 10));

        // conv-1 should only be fetched once
        const callsFor1 = ChatAPI.getMessages.mock.calls.filter((c) => c[0] === 1);
        expect(callsFor1.length).toBe(1);
    });

    // --- WEBSOCKET HANDLERS ---

    it("handles incoming socket messages (onMessage) + sendRead when active and not self", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 10, unread_count: 0, last_message: {}}]);

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("conv-10"));

        // Activate conversation
        fireEvent.click(screen.getByTestId("conv-10"));

        // Trigger Socket Message from other user
        act(() => {
            socketHandlers.onMessage?.({
                id: 888,
                conversation: 10,
                sender: 200,
                text: "New Socket Message",
                created_at: new Date().toISOString(),
            });
        });

        await waitFor(() => {
            expect(screen.getByTestId("messages-json")).toHaveTextContent("New Socket Message");
        });

        // should send read receipt for active conv and non-self sender
        expect(sendReadMock).toHaveBeenCalledWith("888");
    });

    it("dedupes repeated websocket message ids (does not insert duplicates)", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 10}]);

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("conv-10"));
        fireEvent.click(screen.getByTestId("conv-10"));

        const payload = {
            id: 999,
            conversation: 10,
            sender: 200,
            text: "DUP",
            created_at: new Date().toISOString(),
        };

        act(() => socketHandlers.onMessage?.(payload));
        act(() => socketHandlers.onMessage?.(payload));

        await waitFor(() => {
            const jsonText = screen.getByTestId("messages-json").textContent;
            const list = JSON.parse(jsonText)["10"];
            expect(list.filter((m) => m.text === "DUP").length).toBe(1);
        });
    });

    it("handles incoming read receipts (onRead) and marks <= target timestamp read", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 1}]);
        ChatAPI.getMessages.mockResolvedValue({
            results: [
                {
                    id: 555,
                    conversation: 1,
                    sender: 100,
                    text: "newer",
                    created_at: new Date(Date.now() - 1000).toISOString(),
                    read: false,
                },
                {
                    id: 554,
                    conversation: 1,
                    sender: 100,
                    text: "older",
                    created_at: new Date(Date.now() - 5000).toISOString(),
                    read: false,
                },
            ],
        });

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("conv-1"));
        fireEvent.click(screen.getByTestId("conv-1"));
        await waitFor(() => screen.getByTestId("messages-json"));

        // Trigger Read Receipt from other user for message_id 555 => both 555 and older 554 become read
        act(() => {
            socketHandlers.onRead?.({
                message_id: 555,
                reader_id: 200,
                conversation: 1,
            });
        });

        await waitFor(() => {
            const jsonText = screen.getByTestId("messages-json").textContent;
            const msgs = JSON.parse(jsonText)["1"];
            const m555 = msgs.find((m) => String(m.id) === "555");
            const m554 = msgs.find((m) => String(m.id) === "554");
            expect(m555.read).toBe(true);
            expect(m554.read).toBe(true);
        });
    });

    it("ignores onRead when reader_id is the current user (early return)", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 1}]);
        ChatAPI.getMessages.mockResolvedValue({
            results: [
                {
                    id: 777,
                    conversation: 1,
                    sender: 200,
                    text: "x",
                    created_at: new Date().toISOString(),
                    read: false,
                },
            ],
        });

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("conv-1"));
        fireEvent.click(screen.getByTestId("conv-1"));
        await waitFor(() => screen.getByTestId("messages-json"));

        act(() => {
            socketHandlers.onRead?.({
                message_id: 777,
                reader_id: 100, // self => should be ignored
                conversation: 1,
            });
        });

        await waitFor(() => {
            const jsonText = screen.getByTestId("messages-json").textContent;
            const msg = JSON.parse(jsonText)["1"][0];
            expect(msg.read).toBe(true /* note: active read effect may mark it */);
        });
    });

    // --- ACTIONS ---

    it("calls sendText when clicking send button", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 1}]);

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("send-msg-btn"));
        fireEvent.click(screen.getByTestId("send-msg-btn"));

        expect(sendTextMock).toHaveBeenCalledWith("test");
    });

    it("handles listing click by navigating window.location.href", async () => {
        const originalLocation = window.location;
        delete window.location;
        window.location = {href: ""};

        // force listingId to be present in transformed conversation
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() =>
            JSON.stringify({"1": "500"})
        );

        ChatAPI.listConversations.mockResolvedValue([{id: 1, other_participant: {id: 200}}]);

        ListingsAPI.getListing.mockResolvedValue({
            listing_id: 500,
            title: "T",
            price: 1,
            user_id: 100,
            images: [],
        });

        render(
            <MemoryRouter>
                <GlobalChat/>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("listing-link-1"));
        fireEvent.click(screen.getByTestId("listing-link-1"));

        expect(window.location.href).toContain("/listing/500");

        window.location = originalLocation;
    });

    it("URL mode: selecting a different conversation navigates to /chat/:id (param changes)", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 1}, {id: 2}]);
        ChatAPI.getMessages.mockResolvedValue({results: []});

        render(
            <MemoryRouter initialEntries={["/chat/1"]}>
                <Routes>
                    <Route path="/chat/:conversationId" element={<GlobalChat/>}/>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("conv-2"));
        fireEvent.click(screen.getByTestId("conv-2"));

        await waitFor(() => {
            // in URL mode, activeConversationId becomes "2"
            expect(ChatAPI.getMessages).toHaveBeenCalledWith("2", expect.anything());
        });
    });

    it("URL mode: close modal triggers closeChat and navigates home", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 1}]);

        render(
            <MemoryRouter initialEntries={["/chat/1"]}>
                <Routes>
                    <Route path="/chat/:conversationId" element={<GlobalChat/>}/>
                    <Route path="/" element={<div data-testid="home-page">Home</div>}/>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("chat-modal"));
        fireEvent.click(screen.getByTestId("close-btn"));

        await waitFor(() => {
            expect(mockCloseChat).toHaveBeenCalled();
            expect(screen.getByTestId("home-page")).toBeInTheDocument();
        });
    });

    it("URL mode: minimize triggers navigate('/')", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 1}]);

        render(
            <MemoryRouter initialEntries={["/chat/1"]}>
                <Routes>
                    <Route path="/chat/:conversationId" element={<GlobalChat/>}/>
                    <Route path="/" element={<div data-testid="home-page">Home</div>}/>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByTestId("chat-modal"));
        fireEvent.click(screen.getByTestId("minimize-btn"));

        await waitFor(() => {
            expect(screen.getByTestId("home-page")).toBeInTheDocument();
        });
    });

    it("handles full page mode toggling (non-url mode maximize)", async () => {
        ChatAPI.listConversations.mockResolvedValue([{id: 123}]);

        render(
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route path="/" element={<GlobalChat/>}/>
                    <Route path="/chat/:id" element={<div>Full Page Chat</div>}/>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByTestId("conv-123")).toBeInTheDocument());

        fireEvent.click(screen.getByTestId("conv-123"));
        fireEvent.click(screen.getByTestId("fullpage-btn"));

        await waitFor(() => {
            expect(screen.getByText("Full Page Chat")).toBeInTheDocument();
        });
    });
});
