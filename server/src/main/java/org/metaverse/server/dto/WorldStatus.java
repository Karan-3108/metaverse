package org.metaverse.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorldStatus {
  private String worldName;
  private int activeUsers;
  private int totalUsers;
}
