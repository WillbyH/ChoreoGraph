<?php
// $build = file_get_contents('http://'.str_replace("createBuildFile","index",$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']));
// $file=fopen("output/choreograph.js", "a");
// fwrite($file, $build);
// fclose($file);
file_put_contents("output/choreograph.js", file_get_contents('http://'.str_replace("createBuildFile","index",$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'])));

echo "Build file created in output folder.";
?>