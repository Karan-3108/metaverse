package org.metaverse.server.config;

import java.lang.reflect.InvocationTargetException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.metaverse.server.core.ClientFactory;

/**
 * Configuration of object factories, only ClientFactory for the time being.
 * Factory class is specified as a property value.
 * 
 * @author joe
 * @see ClientFactory
 *
 */
@Configuration
public class FactoryConfig {
  @Value("${org.metaverse.server.clientFactory:org.metaverse.server.core.DefaultClientFactory}")
  private String clientFactoryClass;

  /**
   * Creates ClientFactory specified in org.metaverse.server.clientFactory property,
   * by default org.metaverse.server.core.DefaultClientFactory
   * 
   * @return created ClientFactory
   */
  @Bean
  ClientFactory clientFactory() throws InstantiationException, IllegalAccessException, IllegalArgumentException,
      InvocationTargetException, NoSuchMethodException, SecurityException, ClassNotFoundException {
    return (ClientFactory) Class.forName(clientFactoryClass).getDeclaredConstructor().newInstance();
  }
}
