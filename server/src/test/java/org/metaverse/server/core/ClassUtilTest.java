package org.metaverse.server.core;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.metaverse.server.dto.Add;
import org.metaverse.server.dto.Command;
import org.metaverse.server.dto.Echo;
import org.metaverse.server.dto.Enter;
import org.metaverse.server.dto.Remove;
import org.metaverse.server.dto.Session;
import org.metaverse.server.obj.Client;
import org.metaverse.server.obj.EventRecorder;
import org.metaverse.server.obj.VRObject;

public class ClassUtilTest {
  @Test
  public void testSubClasses() throws Exception {
    List<Class<?>> objects = ClassUtil.findSubclasses(VRObject.class);
    System.out.println(objects);
    assertTrue(objects.contains(Client.class));
    assertTrue(objects.contains(EventRecorder.class));

    List<Class<?>> commands = ClassUtil.findSubclasses(Command.class);
    System.out.println(commands);
    assertTrue(commands.contains(Add.class));
    assertTrue(commands.contains(Remove.class));
    assertTrue(commands.contains(Echo.class));
    assertTrue(commands.contains(Enter.class));
    assertTrue(commands.contains(Session.class));
    // .. etc
  }
}
