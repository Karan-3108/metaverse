package org.metaverse.server.api;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.metaverse.server.core.VRObjectRepository;
import org.metaverse.server.dto.WorldStatus;
import org.metaverse.server.obj.World;

import lombok.extern.slf4j.Slf4j;

@RestController
@Slf4j
@RequestMapping("/worlds")
public class WorldController {
  @Autowired
  private VRObjectRepository db;

  @GetMapping("/list")
  public List<World> list() {
    List<World> worlds = db.listWorlds();
    log.debug("Worlds: " + worlds);
    return worlds;
  }

  @GetMapping("/users")
  public List<WorldStatus> users() {
    List<WorldStatus> stats = db.countUsers();
    log.debug("Stats: " + stats);
    return stats;
  }
}
