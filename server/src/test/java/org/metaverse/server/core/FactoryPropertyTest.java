package org.metaverse.server.core;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.security.Principal;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.metaverse.server.config.FactoryConfig;
import org.metaverse.server.obj.Client;

/**
 * Replace Client factory by changing a property
 * 
 * @author joe
 *
 */
@SpringBootTest(properties = {
    "org.metaverse.server.clientFactory:org.metaverse.server.core.FactoryPropertyTest$TestClientFactory" }, classes = FactoryConfig.class)
public class FactoryPropertyTest {
  @Autowired
  ClientFactory clientFactory;

  @Test
  public void testSomething() {
    assertEquals(TestClientFactory.class, clientFactory.getClass());
  }

  // inner class has to be static, otherwise can't be instantiated elsewhere
  public static class TestClientFactory implements ClientFactory {

    @Override
    public Client findClient(Principal principal, VRObjectRepository db, HttpHeaders headers,
        Map<String, Object> attributes) {
      return null;
    }
  }

}
