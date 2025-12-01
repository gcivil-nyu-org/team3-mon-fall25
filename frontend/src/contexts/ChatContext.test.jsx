import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatProvider, useChat } from './ChatContext';

// Test component that uses the chat context
const TestComponent = () => {
    const { isChatOpen, openChat, closeChat } = useChat();
    return (
        <div>
            <div data-testid="chat-state">{isChatOpen ? 'open' : 'closed'}</div>
            <button onClick={openChat}>Open Chat</button>
            <button onClick={closeChat}>Close Chat</button>
        </div>
    );
};

describe('ChatContext', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    describe('ChatProvider', () => {
        it('provides chat context to children', () => {
            render(
                <ChatProvider>
                    <TestComponent />
                </ChatProvider>
            );

            expect(screen.getByTestId('chat-state')).toBeInTheDocument();
        });

        it('initializes with closed state when no sessionStorage value', () => {
            render(
                <ChatProvider>
                    <TestComponent />
                </ChatProvider>
            );

            expect(screen.getByTestId('chat-state')).toHaveTextContent('closed');
        });

        it('initializes with open state when sessionStorage has true', () => {
            sessionStorage.setItem('chatOpen', 'true');

            render(
                <ChatProvider>
                    <TestComponent />
                </ChatProvider>
            );

            expect(screen.getByTestId('chat-state')).toHaveTextContent('open');
        });

        it('initializes with closed state when sessionStorage has false', () => {
            sessionStorage.setItem('chatOpen', 'false');

            render(
                <ChatProvider>
                    <TestComponent />
                </ChatProvider>
            );

            expect(screen.getByTestId('chat-state')).toHaveTextContent('closed');
        });

        it('opens chat when openChat is called', () => {
            render(
                <ChatProvider>
                    <TestComponent />
                </ChatProvider>
            );

            expect(screen.getByTestId('chat-state')).toHaveTextContent('closed');

            act(() => {
                screen.getByText('Open Chat').click();
            });

            expect(screen.getByTestId('chat-state')).toHaveTextContent('open');
            expect(sessionStorage.getItem('chatOpen')).toBe('true');
        });

        it('closes chat when closeChat is called', () => {
            sessionStorage.setItem('chatOpen', 'true');

            render(
                <ChatProvider>
                    <TestComponent />
                </ChatProvider>
            );

            expect(screen.getByTestId('chat-state')).toHaveTextContent('open');

            act(() => {
                screen.getByText('Close Chat').click();
            });

            expect(screen.getByTestId('chat-state')).toHaveTextContent('closed');
            expect(sessionStorage.getItem('chatOpen')).toBe('false');
        });

        it('persists chat state to sessionStorage when opened', () => {
            render(
                <ChatProvider>
                    <TestComponent />
                </ChatProvider>
            );

            act(() => {
                screen.getByText('Open Chat').click();
            });

            expect(sessionStorage.getItem('chatOpen')).toBe('true');
        });

        it('persists chat state to sessionStorage when closed', () => {
            sessionStorage.setItem('chatOpen', 'true');

            render(
                <ChatProvider>
                    <TestComponent />
                </ChatProvider>
            );

            act(() => {
                screen.getByText('Close Chat').click();
            });

            expect(sessionStorage.getItem('chatOpen')).toBe('false');
        });
    });

    describe('useChat hook', () => {
        it('throws error when used outside ChatProvider', () => {
            // Suppress console.error for this test
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                render(<TestComponent />);
            }).toThrow('useChat must be used within a ChatProvider');

            consoleSpy.mockRestore();
        });
    });
});


