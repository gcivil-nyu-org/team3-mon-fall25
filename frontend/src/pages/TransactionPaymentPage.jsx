import React, { useState } from 'react';
import './TransactionPaymentPage.css';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  Send,
  Info,
  ChevronDown,
  ShoppingBag,
  Heart,
  Banknote,
  ArrowRightLeft
} from 'lucide-react';

// --- Constants & Data ---

const LOCATIONS = [
  "Bobst Library - 1st Floor",
  "Bobst Library - Lobby",
  "Tandon School of Engineering",
  "Kimmel Center - Lounge",
  "Washington Square Park - Arch",
  "Palladium Hall - Lobby",
  "Lipton Hall - Lobby",
  "Third North - Lobby",
  "Founders Hall - Lobby",
  "Stern School of Business - Lobby",
  "Other (specify in chat)"
];

const MOCK_CHAT = [
  {
    id: 1,
    sender: 'system',
    text: 'Transaction initiated. Buyer can now set payment and delivery preferences.',
    time: '09:49 PM',
    type: 'system'
  }
];

// --- Sub-Components ---

const Header = () => (
  <div className="header-container">
    {/* Top Purple Bar */}
    <div className="header-top-bar">
      <div className="header-logo-section">
        <div className="header-icon-box">
          <ShoppingBag size={20} className="text-white" />
        </div>
        <div className="header-title">
          <h1>NYU Marketplace - Transaction System Demo</h1>
          <p>Bidirectional negotiation with chat</p>
        </div>
      </div>
    </div>

    {/* View As Bar */}
    <div className="header-view-bar">
      <div className="view-as-container">
        <span>View as:</span>
        <div className="toggle-switch">
          <button className="toggle-btn active">
            Buyer (Alex Chen)
          </button>
          <button className="toggle-btn inactive">
            Seller (Jordan Smith)
          </button>
        </div>
      </div>
      <div className="status-badge">
        Status: PENDING
      </div>
    </div>
  </div>
);

const TransactionDetailsCard = () => (
  <div className="card card-padding details-card-inner">
    <div className="pending-badge">
      Pending
    </div>
    <div className="item-image-container">
      <img
        src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300"
        alt="Textbook"
        className="item-image"
      />
    </div>
    <div className="item-info">
      <h2 className="item-title">Calculus Textbook - 9th Edition</h2>
      <p className="item-desc">Barely used calculus textbook. Perfect condition with no highlighting.</p>

      <div className="item-price-row">
        <span className="price-tag">$45</span>
        <div className="participants-info">
          <p><span>Seller:</span> Jordan Smith</p>
          <p><span>Buyer:</span> Alex Chen</p>
        </div>
      </div>
    </div>
  </div>
);

const PaymentOption = ({ id, label, subLabel, icon, selected, onSelect }) => (
  <div
    onClick={() => onSelect(id)}
    className={`payment-option ${selected ? 'selected' : ''}`}
  >
    <div className="payment-icon">
       {icon}
    </div>
    <div className="payment-details">
      <p className="payment-label">{label}</p>
      <p className="payment-sublabel">{subLabel}</p>
    </div>
    {selected && <div className="active-indicator"></div>}
  </div>
);

const TimelineItem = ({ title, desc, status, isLast }) => {
  const isCompleted = status === 'completed';
  const isCurrent = status === 'current';
  // const isUpcoming = status === 'upcoming';

  return (
    <div className="timeline-item">
      {!isLast && (
        <div className={`timeline-line ${isCompleted ? 'completed' : ''}`} />
      )}
      <div className={`timeline-dot ${status}`}>
        {isCompleted ? <CheckCircle2 size={14} /> : isCurrent ? <Clock size={14} /> : <Circle size={14} />}
      </div>
      <div className="timeline-content">
        <p className={`timeline-title ${status}`}>{title}</p>
        <p className="timeline-desc">{desc}</p>
      </div>
    </div>
  );
};

// --- Main Component ---

export default function TransactionPaymentPage() {
  const [paymentMethod, setPaymentMethod] = useState('venmo');
  const [deliveryType, setDeliveryType] = useState('meetup');
  const [location, setLocation] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatInput('');
  };

  return (
    <div className="transaction-page-container">
      <Header />

      <main className="main-content">
        <div className="content-grid">

          {/* Left Column (Main Content) */}
          <div className="left-column">
            <TransactionDetailsCard />

            {/* Proposal Card */}
            <div className="card">
              <div className="card-header">
                <h3>Transaction Proposal</h3>
              </div>

              <div className="card-padding">

                {/* Payment Method Section */}
                <div className="section-group">
                  <label className="section-label">Payment Method</label>
                  <div className="options-stack">
                    <PaymentOption
                      id="venmo"
                      label="Venmo"
                      subLabel="Send via Venmo"
                      icon={<Heart size={18} color={paymentMethod === 'venmo' ? '#60a5fa' : '#3b82f6'} fill={paymentMethod === 'venmo' ? '#60a5fa' : '#3b82f6'} />}
                      selected={paymentMethod === 'venmo'}
                      onSelect={setPaymentMethod}
                    />
                    <PaymentOption
                      id="zelle"
                      label="Zelle"
                      subLabel="Send via Zelle"
                      icon={<div style={{ width: 16, height: 16, borderRadius: 2, backgroundColor: '#9333ea' }} />}
                      selected={paymentMethod === 'zelle'}
                      onSelect={setPaymentMethod}
                    />
                     <PaymentOption
                      id="cash"
                      label="Cash"
                      subLabel="Pay in person"
                      icon={<Banknote size={18} color="#16a34a" />}
                      selected={paymentMethod === 'cash'}
                      onSelect={setPaymentMethod}
                    />
                  </div>
                </div>

                {/* Delivery Details Section */}
                <div className="section-group">
                   <label className="section-label">Delivery Details</label>
                   <div className="delivery-toggle-container">
                     <button
                       onClick={() => setDeliveryType('meetup')}
                       className={`toggle-option ${deliveryType === 'meetup' ? 'active' : 'inactive'}`}
                     >
                       <ArrowRightLeft size={14} />
                       Meetup
                     </button>
                     <button
                        onClick={() => setDeliveryType('pickup')}
                        className={`toggle-option ${deliveryType === 'pickup' ? 'active' : 'inactive'}`}
                     >
                       <MapPin size={14} />
                       Pickup
                     </button>
                   </div>
                </div>

                {/* Location Dropdown */}
                <div className="section-group">
                  <label className="section-label">
                    {deliveryType === 'meetup' ? 'Meeting Location' : 'Pickup Location'}
                  </label>

                  <div className="location-dropdown-wrapper">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`dropdown-trigger ${isDropdownOpen ? 'open' : ''}`}
                    >
                      <span style={{ color: location ? '#111827' : '#6b7280', fontWeight: location ? 500 : 400 }}>
                        {location || "Choose a location"}
                      </span>
                      <ChevronDown size={16} color="#9ca3af" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="dropdown-menu">
                        {LOCATIONS.map((loc) => (
                          <div
                            key={loc}
                            onClick={() => {
                              setLocation(loc);
                              setIsDropdownOpen(false);
                            }}
                            className="dropdown-item"
                          >
                            {loc}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="helper-text">
                    <Info size={12} />
                    <span>
                    {deliveryType === 'meetup'
                      ? 'Select a safe public location on campus.'
                      : 'The buyer will come to this location to pick up the item.'}
                    </span>
                  </div>
                </div>

                {/* Meeting Time */}
                <div className="section-group">
                  <label className="section-label">Meeting Time</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="save-btn"
                >
                  {isSaving ? (
                    <>
                      <div className="spinner" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>

              </div>
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="right-column">

            {/* Progress Card */}
            <div className="card card-padding">
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Progress</h3>
              </div>
              <div className="timeline-container">
                <TimelineItem
                  title="Initiated"
                  desc="Transaction started"
                  status="current"
                />
                <TimelineItem
                  title="Negotiating"
                  desc="Setting up details"
                  status="upcoming"
                />
                <TimelineItem
                  title="Scheduled"
                  desc="Ready to exchange"
                  status="upcoming"
                />
                <TimelineItem
                  title="Completed"
                  desc="Item sold"
                  status="upcoming"
                  isLast={true}
                />
              </div>
            </div>

            {/* Chat Card */}
            <div className="card chat-container">
              <div className="card-header">
                <h3>Chat</h3>
              </div>

              {/* Messages Area */}
              <div className="chat-messages-area">
                 {MOCK_CHAT.map(msg => (
                   <div key={msg.id} className="chat-bubble">
                     <div className="chat-bubble-content">
                       <div className="chat-icon-box">
                         <Info size={14} color="#2563eb" />
                       </div>
                       <div>
                         <p className="chat-text">{msg.text}</p>
                         <span className="chat-time">{msg.time}</span>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>

              {/* Input Area */}
              <div className="chat-input-area">
                <div className="chat-input-wrapper">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="chat-send-btn"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}