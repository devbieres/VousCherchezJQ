# Get the directory that this configuration file exists in
dir = File.dirname(__FILE__)

load File.join(dir, '..')

sass_path    = dir
css_path     = File.join(dir, ".")
output_style = :expanded
environment  = :development
