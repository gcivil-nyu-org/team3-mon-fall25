import React from "react";
import "./UserInfoBlock.css";

/**
 * UserInfoBlock - Displays user avatar and username
 * @param {Object} props
 * @param {Object} props.user - User object with id, name, avatar, initials, isOnline, memberSince
 * @param {boolean} [props.showOnlineStatus=false] - Show online status indicator
 * @param {boolean} [props.showMemberSince=false] - Show member since date
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Avatar size
 */
export default function UserInfoBlock({
  user,
  showOnlineStatus = false,
  showMemberSince = false,
  size = "md",
}) {
  if (!user) return null;

  const sizeClasses = {
    sm: "user-info-block--sm",
    md: "user-info-block--md",
    lg: "user-info-block--lg",
  };

  const avatarSizeClasses = {
    sm: "user-info-block__avatar--sm",
    md: "user-info-block__avatar--md",
    lg: "user-info-block__avatar--lg",
  };

  const memberSinceDate = user.memberSince
    ? new Date(user.memberSince)
    : null;
  const memberSinceText = memberSinceDate
    ? memberSinceDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
    : "";

  return (
    <div className={`user-info-block ${sizeClasses[size]}`}>
      <div className="user-info-block__avatar-wrapper">
        <div className={`user-info-block__avatar ${avatarSizeClasses[size]}`}>
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} />
          ) : (
            <span className="user-info-block__initials">
              {user.initials || user.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          )}
        </div>
        {showOnlineStatus && user.isOnline && (
          <div className="user-info-block__online-indicator" />
        )}
      </div>

      <div className="user-info-block__info">
        <span className="user-info-block__name">{user.name || "User"}</span>
        {showMemberSince && memberSinceText && (
          <span className="user-info-block__member-since">
            Member since {memberSinceText}
          </span>
        )}
      </div>
    </div>
  );
}
