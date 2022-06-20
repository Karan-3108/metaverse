package org.metaverse.server.types;

import java.util.function.Function;

import org.metaverse.server.obj.Client;
import org.metaverse.server.obj.VRObject;

@FunctionalInterface
public interface Filter extends Function<VRObject, Boolean> {

  static Filter isActive() {
    return o -> o.isActive();
  }

  static Filter isOwned(Client c) {
    return o -> c.isOwner(o);
  }

  static Filter isActiveOrOwned(Client c) {
    return o -> o.isActive() || c.isOwner(o);
  }

  static Filter removeOfflineClients() {
    return o -> !(o instanceof Client) || ((Client) o).isActive();
  }
}
