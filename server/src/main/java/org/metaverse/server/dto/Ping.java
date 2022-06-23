package org.metaverse.server.dto;

import org.metaverse.server.core.WorldManager;
import org.metaverse.server.obj.Client;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class Ping implements Command {
  private static final String PONG = "Pong";

  @Override
  public ClientResponse execute(WorldManager manager, Client client) throws ClassNotFoundException {
    return new ClientResponse(PONG);
  }
}
