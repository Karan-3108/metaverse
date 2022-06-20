package org.metaverse.server.dto;

import java.util.ArrayList;
import java.util.List;

import org.metaverse.server.obj.Content;

import lombok.Data;

@Data
public class FileList {
  private String path;
  private List<Content> contentList = new ArrayList<Content>();

}
