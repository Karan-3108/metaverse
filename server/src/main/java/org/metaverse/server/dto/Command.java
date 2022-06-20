package org.metaverse.server.dto;

import org.metaverse.server.core.WorldManager;
import org.metaverse.server.obj.Client;

public interface Command {

  ClientResponse execute(WorldManager worldManager, Client client) throws Exception;

}
