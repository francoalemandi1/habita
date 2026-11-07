import { View } from "react-native";
import { Avatar } from "./avatar";
import type { AvatarSize } from "./avatar";

export interface AvatarGroupMember {
  id: string;
  name: string;
  isCurrentUser?: boolean;
}

export interface AvatarGroupProps {
  members: AvatarGroupMember[];
  size?: AvatarSize;
  max?: number;
}

/** §6.10 AvatarGroup — overlapped avatars, -8 offset, members in household seniority order. */
export function AvatarGroup({ members, size = 28, max = 4 }: AvatarGroupProps): React.JSX.Element {
  const visible = members.slice(0, max);

  return (
    <View accessibilityRole="list" style={{ flexDirection: "row" }}>
      {visible.map((member, index) => (
        <View key={member.id} style={{ marginLeft: index === 0 ? 0 : -8, zIndex: visible.length - index }}>
          <Avatar name={member.name} size={size} isCurrentUser={member.isCurrentUser} />
        </View>
      ))}
    </View>
  );
}
