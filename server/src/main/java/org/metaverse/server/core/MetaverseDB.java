package org.metaverse.server.core;

import java.util.Optional;

import org.springframework.stereotype.Component;
import org.metaverse.server.obj.Client;
import org.metaverse.server.obj.Entity;

@Component
public interface MetaverseDB {
  <T extends Entity> T get(Class<T> cls, Long id);

  Client getClientByName(String name);

  <T extends Client> T getClientByName(String name, Class<T> cls);

  <T extends Entity> Optional<T> findById(Class<T> cls, Long id);

  <T extends Entity> void deleteById(Class<T> cls, Long id);
}
