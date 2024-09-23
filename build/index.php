<?php
$mainContent = file_get_contents("../choreograph.js");
$build = $mainContent;
if (isset($_GET["p"])) {
  $plugins = explode(",",$_GET["p"]);
  for ($i = 0; $i < count($plugins); $i++) {
    $pluginContent = file_get_contents("../plugins/" . $plugins[$i] . ".js");
    $build = $build . "\r\n";
    $build = $build . $pluginContent;
  }
}
echo $build;
?>