package org.metaverse.server.dto;

import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
public class SceneProperties {

  @Value("${metaverse.scene.range:2000}")
  private double range = 2000;
  @Value("${metaverse.scene.resolution:10}")
  private double resolution = 10;
  @Value("${metaverse.scene.size:1000}")
  private int size = 1000;
  @Value("${metaverse.scene.timeout:30000}")
  private long timeout = 30000;

  public SceneProperties newInstance() {
    SceneProperties ret = new SceneProperties();
    BeanUtils.copyProperties(this, ret);
    return ret;
  }
}
