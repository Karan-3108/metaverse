package org.metaverse.server.dto;

import org.metaverse.server.core.WorldManager;
import org.metaverse.server.obj.Client;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class Enter implements Command {
  private String world;

  @Override
  public ClientResponse execute(WorldManager manager, Client client) throws ClassNotFoundException {
    Welcome welcome = manager.enter(client, this.world);
    client.sendMessage(welcome);
    return null;
  }
}
